import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

export interface ToolReply {
  text: string;
  isError: boolean;
}

interface JsonRpcReply {
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

/** Talks to an MCP server over stdio the way Claude Code does: one JSON-RPC message per line. */
export class McpClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, { resolve: (reply: JsonRpcReply) => void; reject: (error: Error) => void }>();
  private readonly log: string[] = [];
  private nextId = 1;
  private exit: Error | undefined;

  private constructor(child: ChildProcessWithoutNullStreams) {
    this.child = child;
    createInterface({ input: child.stdout }).on('line', (line) => {
      const reply = JSON.parse(line) as JsonRpcReply;
      if (reply.id === undefined) return;
      this.pending.get(reply.id)?.resolve(reply);
      this.pending.delete(reply.id);
    });
    createInterface({ input: child.stderr }).on('line', (line) => this.log.push(line));
    child.on('exit', (code) => {
      this.exit = new Error(`MCP server exited with code ${code}: ${this.log.slice(-5).join(' | ')}`);
      for (const { reject } of this.pending.values()) reject(this.exit);
      this.pending.clear();
    });
  }

  /** Starts `node <serverPath>` and completes the MCP handshake. */
  static async start(serverPath: string, env: NodeJS.ProcessEnv): Promise<McpClient> {
    const client = new McpClient(spawn(process.execPath, [serverPath], { env, stdio: ['pipe', 'pipe', 'pipe'] }));
    await client.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'webharvester-mcp-tests', version: '0' } });
    client.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    return client;
  }

  async request(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    if (this.exit) throw this.exit;
    const id = this.nextId++;
    const reply = await new Promise<JsonRpcReply>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
    if (reply.error) throw new Error(`${method}: ${reply.error.message} (${reply.error.code})`);
    return reply.result ?? {};
  }

  async call(name: string, args: Record<string, unknown>): Promise<ToolReply> {
    const result = (await this.request('tools/call', { name, arguments: args })) as { content?: Array<{ text?: string }>; isError?: boolean };
    return { text: result.content?.map((part) => part.text ?? '').join('\n') ?? '', isError: result.isError ?? false };
  }

  /** The server's stderr lines since the last call of this method. */
  takeLog(): string[] {
    return this.log.splice(0);
  }

  close(): void {
    this.child.kill();
  }
}
