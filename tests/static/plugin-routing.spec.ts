import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const pluginFile = (path: string) => fileURLToPath(new URL(`../../plugin/${path}`, import.meta.url));
const searchTool = 'mcp__plugin_web-harvester_growser__web_search';
const fetchTool = 'mcp__plugin_web-harvester_growser__web_fetch';

/** Starts the real server entry point, sends `initialize` and `tools/list`, returns both answers. */
async function startServer(): Promise<{ instructions: string; tools: string[] }> {
  const child = spawn(process.execPath, [pluginFile('server/main.ts')], { stdio: ['pipe', 'pipe', 'ignore'] });
  const replies = new Promise<string[]>((resolve) => {
    let buffered = '';
    child.stdout.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      const lines = buffered.split('\n').filter(Boolean);
      if (lines.length >= 2) resolve(lines);
    });
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`);
  const [initialize, list] = (await replies).map((line) => JSON.parse(line));
  child.stdin.end();
  return { instructions: initialize.result.instructions, tools: list.result.tools.map((tool: { name: string }) => tool.name) };
}

const gate = (payload: string) =>
  JSON.parse(execFileSync(process.execPath, [pluginFile('hooks/web-gate.ts')], { input: payload, encoding: 'utf8' })).hookSpecificOutput;

test.describe('routing the web through Growser', () => {
  test('the growser server offers both tools and tells every session to use them', async () => {
    const { instructions, tools } = await startServer();
    expect(tools).toEqual(['web_search', 'web_fetch']);
    expect(instructions).toContain(searchTool);
    expect(instructions).toContain(fetchTool);
    expect(instructions).toMatch(/WebSearch and WebFetch are blocked/);
    expect(instructions).toMatch(/never solve it yourself/i);
  });

  test('the hook denies each built-in tool and names its replacement', () => {
    const search = gate(JSON.stringify({ tool_name: 'WebSearch', tool_input: { query: 'x' } }));
    expect(search).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'deny' });
    expect(search.permissionDecisionReason).toMatch(new RegExp(`^WebSearch is disabled.*Use ${searchTool} instead`));
    const fetch = gate(JSON.stringify({ tool_name: 'WebFetch', tool_input: { url: 'https://x.example/' } }));
    expect(fetch.permissionDecision).toBe('deny');
    expect(fetch.permissionDecisionReason).toMatch(new RegExp(`^WebFetch is disabled.*Use ${fetchTool} instead`));
  });

  test('the hook still denies, naming both tools, when the payload is unreadable', () => {
    const output = gate('not json');
    expect(output.permissionDecision).toBe('deny');
    expect(output.permissionDecisionReason).toContain(`${searchTool} or ${fetchTool}`);
  });

  test('hooks.json sends exactly WebSearch and WebFetch to the hook', () => {
    const config = JSON.parse(readFileSync(pluginFile('hooks/hooks.json'), 'utf8'));
    expect(config.hooks.PreToolUse).toHaveLength(1);
    const matcher = new RegExp(config.hooks.PreToolUse[0].matcher);
    expect(['WebSearch', 'WebFetch'].every((name) => matcher.test(name))).toBe(true);
    expect(['WebSearchX', 'Bash', 'mcp__plugin_web-harvester_growser__web_fetch'].some((name) => matcher.test(name))).toBe(false);
    expect(config.hooks.PreToolUse[0].hooks[0].command).toBe('node "${CLAUDE_PLUGIN_ROOT}/hooks/web-gate.ts"');
  });
});
