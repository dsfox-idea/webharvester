import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { log } from './log.ts';

/**
 * The user's answer to a question asked through MCP elicitation. `unavailable`:
 * the client cannot ask (no elicitation support, a headless session, the
 * dialog was dismissed, or no answer in time).
 */
export type UserAnswer = 'accepted' | 'declined' | 'unavailable';
export type AskUser = (message: string) => Promise<UserAnswer>;

/** What a tool call can use besides its arguments. */
export interface ToolContext {
  /** Asks the user to do something outside Claude Code and confirm; never throws. */
  askUser: AskUser;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  /** Resolves to the text answer; a thrown error becomes an `isError` answer the model can read. */
  call(args: Record<string, unknown>, context: ToolContext): Promise<string>;
}

export interface ServerInfo {
  name: string;
  version: string;
}

type RequestId = number | string;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: RequestId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: RequestId | null;
  result?: unknown;
  error?: { code: number; message: string };
}

class ProtocolError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * The part of the Model Context Protocol this plugin needs, over stdio:
 * newline-delimited JSON-RPC with initialize, ping, tools/list and tools/call,
 * plus elicitation/create sent to the client when a tool needs the user.
 * Dependency-free because Claude Code copies the plugin into its cache without
 * node_modules.
 */
export class McpServer {
  static readonly fallbackProtocolVersion = '2025-06-18';
  /** Long enough for the user to go to the browser and complete a check. */
  static readonly elicitationTimeoutMs = 10 * 60_000;
  static readonly confirmationSchema = {
    type: 'object',
    properties: { done: { type: 'boolean', title: 'Done in Growser', default: true } },
    required: ['done'],
  };

  private readonly info: ServerInfo;
  private readonly tools: Map<string, ToolDefinition>;
  /** Claude Code puts these into the system prompt of every session that has the server. */
  private readonly instructions: string | undefined;
  private clientCapabilities: Record<string, unknown> = {};
  private output: Writable | undefined;
  private readonly outgoing = new Map<string, (response: JsonRpcResponse) => void>();
  private nextOutgoingId = 1;

  constructor(info: ServerInfo, tools: readonly ToolDefinition[], instructions?: string) {
    this.info = info;
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
    this.instructions = instructions;
  }

  /** The tools subset is the same in every protocol revision, so the client's revision is accepted as is. */
  static protocolVersion(requested: unknown): string {
    return typeof requested === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : McpServer.fallbackProtocolVersion;
  }

  /** Answers one message; notifications get no answer. */
  async handle(message: unknown): Promise<JsonRpcResponse | undefined> {
    if (!McpServer.isRequest(message)) return McpServer.failure(null, -32600, 'Invalid request');
    if (message.id === undefined) return undefined;
    try {
      return { jsonrpc: '2.0', id: message.id, result: await this.dispatch(message.method, message.params ?? {}) };
    } catch (error) {
      if (error instanceof ProtocolError) return McpServer.failure(message.id, error.code, error.message);
      log(`internal error in ${message.method}:`, error);
      return McpServer.failure(message.id, -32603, error instanceof Error ? error.message : String(error));
    }
  }

  /** Serves until `input` ends. */
  serve(input: Readable, output: Writable): Promise<void> {
    this.output = output;
    const lines = createInterface({ input, crlfDelay: Infinity });
    lines.on('line', (line) => void this.receive(line, output));
    return new Promise((resolve) => lines.once('close', resolve));
  }

  /** Asks the user through the client (MCP elicitation) to do something and confirm. */
  async askUser(message: string): Promise<UserAnswer> {
    if (!this.clientCapabilities.elicitation || !this.output) return 'unavailable';
    try {
      const reply = await this.request('elicitation/create', { message, requestedSchema: McpServer.confirmationSchema }, McpServer.elicitationTimeoutMs);
      const result = reply.result as { action?: string; content?: { done?: unknown } } | undefined;
      log(`elicitation answered: ${JSON.stringify(reply.result ?? reply.error)}`);
      if (result?.action === 'accept') return result.content?.done === false ? 'declined' : 'accepted';
      return result?.action === 'decline' ? 'declined' : 'unavailable';
    } catch (error) {
      log(`elicitation failed: ${error instanceof Error ? error.message : String(error)}`);
      return 'unavailable';
    }
  }

  private request(method: string, params: Record<string, unknown>, timeoutMs: number): Promise<JsonRpcResponse> {
    const id = `server-${this.nextOutgoingId++}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.outgoing.delete(id);
        reject(new Error(`${method} got no answer within ${timeoutMs} ms`));
      }, timeoutMs);
      this.outgoing.set(id, (response) => {
        clearTimeout(timer);
        resolve(response);
      });
      this.output!.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  private async receive(line: string, output: Writable): Promise<void> {
    if (line.trim() === '') return;
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      output.write(`${JSON.stringify(McpServer.failure(null, -32700, 'Parse error'))}\n`);
      return;
    }
    if (this.answersOutgoing(message)) return;
    const response = await this.handle(message);
    if (response) output.write(`${JSON.stringify(response)}\n`);
  }

  /** A response from the client to a request this server sent. */
  private answersOutgoing(message: unknown): boolean {
    if (message === null || typeof message !== 'object' || 'method' in message || !('id' in message)) return false;
    const response = message as JsonRpcResponse;
    const resolve = typeof response.id === 'string' ? this.outgoing.get(response.id) : undefined;
    if (!resolve) return false;
    this.outgoing.delete(response.id as string);
    resolve(response);
    return true;
  }

  private async dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize':
        this.clientCapabilities = params.capabilities !== null && typeof params.capabilities === 'object' ? (params.capabilities as Record<string, unknown>) : {};
        return {
          protocolVersion: McpServer.protocolVersion(params.protocolVersion),
          capabilities: { tools: { listChanged: false } },
          serverInfo: this.info,
          ...(this.instructions === undefined ? {} : { instructions: this.instructions }),
        };
      case 'ping':
        return {};
      case 'tools/list':
        return {
          tools: [...this.tools.values()].map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema })),
        };
      case 'tools/call':
        return this.callTool(params);
      default:
        throw new ProtocolError(-32601, `Method not found: ${method}`);
    }
  }

  private async callTool(params: Record<string, unknown>): Promise<unknown> {
    const tool = typeof params.name === 'string' ? this.tools.get(params.name) : undefined;
    if (!tool) throw new ProtocolError(-32602, `Unknown tool: ${String(params.name)}`);
    const args = params.arguments !== null && typeof params.arguments === 'object' ? (params.arguments as Record<string, unknown>) : {};
    const started = Date.now();
    try {
      const text = await tool.call(args, { askUser: (message) => this.askUser(message) });
      log(`${tool.name} answered in ${Date.now() - started} ms`);
      return { content: [{ type: 'text', text }] };
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      log(`${tool.name} failed after ${Date.now() - started} ms: ${text}`);
      return { content: [{ type: 'text', text }], isError: true };
    }
  }

  private static isRequest(message: unknown): message is JsonRpcRequest {
    if (message === null || typeof message !== 'object' || Array.isArray(message)) return false;
    const candidate = message as Partial<JsonRpcRequest>;
    const validId = candidate.id === undefined || typeof candidate.id === 'number' || typeof candidate.id === 'string';
    const validParams = candidate.params === undefined || (candidate.params !== null && typeof candidate.params === 'object');
    return candidate.jsonrpc === '2.0' && typeof candidate.method === 'string' && validId && validParams;
  }

  private static failure(id: RequestId | null, code: number, message: string): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}
