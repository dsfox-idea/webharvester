import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { log } from './log.ts';

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  /** Resolves to the text answer; a thrown error becomes an `isError` answer the model can read. */
  call(args: Record<string, unknown>): Promise<string>;
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
 * newline-delimited JSON-RPC with initialize, ping, tools/list and tools/call.
 * Dependency-free because Claude Code copies the plugin into its cache without
 * node_modules.
 */
export class McpServer {
  static readonly fallbackProtocolVersion = '2025-06-18';

  private readonly info: ServerInfo;
  private readonly tools: Map<string, ToolDefinition>;

  constructor(info: ServerInfo, tools: readonly ToolDefinition[]) {
    this.info = info;
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
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
    const lines = createInterface({ input, crlfDelay: Infinity });
    lines.on('line', (line) => void this.receive(line, output));
    return new Promise((resolve) => lines.once('close', resolve));
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
    const response = await this.handle(message);
    if (response) output.write(`${JSON.stringify(response)}\n`);
  }

  private async dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: McpServer.protocolVersion(params.protocolVersion),
          capabilities: { tools: { listChanged: false } },
          serverInfo: this.info,
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
      const text = await tool.call(args);
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
