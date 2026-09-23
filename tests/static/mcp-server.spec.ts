import { PassThrough } from 'node:stream';
import { expect, test } from '@playwright/test';
import { McpServer, type JsonRpcResponse, type ToolDefinition } from '../../plugin/server/mcp-server.ts';

const echo: ToolDefinition = {
  name: 'echo',
  description: 'Echoes its text argument.',
  inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
  call: async (args) => {
    if (args.text === 'boom') throw new Error('it broke');
    return `echo: ${String(args.text)}`;
  },
};

const server = () => new McpServer({ name: 'test', version: '1.2.3' }, [echo]);
const request = (id: number, method: string, params?: Record<string, unknown>) => ({ jsonrpc: '2.0', id, method, params });

test.describe('McpServer.handle', () => {
  test('initialize accepts the client protocol revision and announces tools', async () => {
    expect(await server().handle(request(1, 'initialize', { protocolVersion: '2026-01-01' }))).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { protocolVersion: '2026-01-01', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'test', version: '1.2.3' } },
    });
    const fallback = await server().handle(request(2, 'initialize', { protocolVersion: 'garbage' }));
    expect((fallback?.result as { protocolVersion: string }).protocolVersion).toBe(McpServer.fallbackProtocolVersion);
  });

  test('initialize carries server instructions only when there are some', async () => {
    const withInstructions = new McpServer({ name: 'test', version: '1' }, [echo], 'Use echo.');
    expect((await withInstructions.handle(request(1, 'initialize')))?.result).toMatchObject({ instructions: 'Use echo.' });
    expect((await server().handle(request(1, 'initialize')))?.result).not.toHaveProperty('instructions');
  });

  test('notifications get no answer, ping gets an empty result', async () => {
    expect(await server().handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeUndefined();
    expect(await server().handle(request(3, 'ping'))).toEqual({ jsonrpc: '2.0', id: 3, result: {} });
  });

  test('tools/list exposes name, description and schema', async () => {
    const reply = await server().handle(request(4, 'tools/list'));
    expect(reply?.result).toEqual({ tools: [{ name: 'echo', description: echo.description, inputSchema: echo.inputSchema }] });
  });

  test('tools/call returns text, and a thrown error as an isError answer', async () => {
    expect((await server().handle(request(5, 'tools/call', { name: 'echo', arguments: { text: 'hi' } })))?.result).toEqual({
      content: [{ type: 'text', text: 'echo: hi' }],
    });
    expect((await server().handle(request(6, 'tools/call', { name: 'echo', arguments: { text: 'boom' } })))?.result).toEqual({
      content: [{ type: 'text', text: 'it broke' }],
      isError: true,
    });
  });

  test('protocol errors: unknown tool, unknown method, malformed request', async () => {
    expect((await server().handle(request(7, 'tools/call', { name: 'nope' })))?.error).toEqual({ code: -32602, message: 'Unknown tool: nope' });
    expect((await server().handle(request(8, 'resources/list')))?.error?.code).toBe(-32601);
    for (const bad of [null, [], 'x', { jsonrpc: '1.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', id: {}, method: 'ping' }]) {
      expect((await server().handle(bad))?.error?.code, JSON.stringify(bad)).toBe(-32600);
    }
  });
});

test.describe('McpServer.serve', () => {
  test('answers newline-delimited JSON-RPC over streams, including a parse error', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const replies: JsonRpcResponse[] = [];
    let buffered = '';
    output.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      const lines = buffered.split('\n');
      buffered = lines.pop() ?? '';
      replies.push(...lines.map((line) => JSON.parse(line) as JsonRpcResponse));
    });
    const served = server().serve(input, output);
    input.write(`${JSON.stringify(request(1, 'ping'))}\n\n{not json\n`);
    input.write(`${JSON.stringify(request(2, 'tools/call', { name: 'echo', arguments: { text: 'кириллица' } }))}\n`);
    input.end();
    await served;
    await expect.poll(() => replies.length).toBe(3);
    expect(replies).toContainEqual({ jsonrpc: '2.0', id: 1, result: {} });
    expect(replies).toContainEqual({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    expect(replies).toContainEqual({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: 'echo: кириллица' }] } });
  });
});

test.describe('McpServer elicitation', () => {
  /** A server whose tool asks the user once and returns the answer, wired to in-memory streams. */
  const session = (capabilities: Record<string, unknown>) => {
    const asker: ToolDefinition = {
      name: 'ask',
      description: 'Asks the user.',
      inputSchema: { type: 'object' },
      call: async (_args, context) => context.askUser('Complete the check, then confirm.'),
    };
    const input = new PassThrough();
    const output = new PassThrough();
    const sent: Array<Record<string, unknown>> = [];
    let buffered = '';
    output.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      const lines = buffered.split('\n');
      buffered = lines.pop() ?? '';
      sent.push(...lines.map((line) => JSON.parse(line) as Record<string, unknown>));
    });
    const served = new McpServer({ name: 'test', version: '1' }, [asker]).serve(input, output);
    const write = (message: unknown) => input.write(`${JSON.stringify(message)}\n`);
    write(request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities }));
    write(request(2, 'tools/call', { name: 'ask', arguments: {} }));
    return { sent, write, done: async () => (input.end(), served) };
  };
  const toolAnswer = (sent: Array<Record<string, unknown>>) =>
    (sent.find((message) => message.id === 2)?.result as { content: Array<{ text: string }> } | undefined)?.content[0].text;

  for (const [reply, expected] of [
    [{ action: 'accept', content: { done: true } }, 'accepted'],
    [{ action: 'accept', content: { done: false } }, 'declined'],
    [{ action: 'decline' }, 'declined'],
    [{ action: 'cancel' }, 'unavailable'],
  ] as const) {
    test(`maps the client's ${JSON.stringify(reply)} to ${expected}`, async () => {
      const { sent, write, done } = session({ elicitation: {} });
      await expect.poll(() => sent.find((message) => message.method === 'elicitation/create')).toBeTruthy();
      const asked = sent.find((message) => message.method === 'elicitation/create')!;
      expect(asked.params).toEqual({ message: 'Complete the check, then confirm.', requestedSchema: McpServer.confirmationSchema });
      write({ jsonrpc: '2.0', id: asked.id, result: reply });
      await expect.poll(() => toolAnswer(sent)).toBe(expected);
      expect(sent.some((message) => message.error)).toBe(false);
      await done();
    });
  }

  test('an error from the client counts as unavailable', async () => {
    const { sent, write, done } = session({ elicitation: {} });
    await expect.poll(() => sent.find((message) => message.method === 'elicitation/create')).toBeTruthy();
    write({ jsonrpc: '2.0', id: sent.find((message) => message.method === 'elicitation/create')!.id, error: { code: -32601, message: 'Method not found' } });
    await expect.poll(() => toolAnswer(sent)).toBe('unavailable');
    await done();
  });

  test('never asks a client that did not declare elicitation', async () => {
    const { sent, done } = session({ roots: {} });
    await expect.poll(() => toolAnswer(sent)).toBe('unavailable');
    expect(sent.some((message) => message.method === 'elicitation/create')).toBe(false);
    await done();
  });
});
