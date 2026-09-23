import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const pluginFile = (path: string) => fileURLToPath(new URL(`../../plugin/${path}`, import.meta.url));
const toolName = 'mcp__plugin_web-harvester_growser__web_search';

/** Starts the real server entry point, sends `initialize`, returns the first answer. */
async function initializeServer(): Promise<{ result: { serverInfo: { name: string }; instructions?: string } }> {
  const child = spawn(process.execPath, [pluginFile('server/main.ts')], { stdio: ['pipe', 'pipe', 'ignore'] });
  const firstLine = new Promise<string>((resolve) => {
    let buffered = '';
    child.stdout.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      if (buffered.includes('\n')) resolve(buffered.split('\n')[0]);
    });
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })}\n`);
  const line = await firstLine;
  child.stdin.end();
  return JSON.parse(line);
}

test.describe('routing web search through Growser', () => {
  test('the growser server tells every session to use web_search instead of WebSearch', async () => {
    const { result } = await initializeServer();
    expect(result.serverInfo.name).toBe('growser');
    expect(result.instructions).toContain(toolName);
    expect(result.instructions).toMatch(/WebSearch is blocked/);
    expect(result.instructions).toMatch(/never solve it yourself/);
  });

  test('the hook denies WebSearch and names the replacement tool', () => {
    const output = JSON.parse(execFileSync(process.execPath, [pluginFile('hooks/websearch-gate.ts')], { input: '{}', encoding: 'utf8' }));
    expect(output.hookSpecificOutput).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'deny' });
    expect(output.hookSpecificOutput.permissionDecisionReason).toContain(toolName);
  });

  test('hooks.json sends WebSearch, and only WebSearch, to that hook', () => {
    const config = JSON.parse(readFileSync(pluginFile('hooks/hooks.json'), 'utf8'));
    expect(config.hooks.PreToolUse).toHaveLength(1);
    expect(config.hooks.PreToolUse[0].matcher).toBe('WebSearch');
    expect(config.hooks.PreToolUse[0].hooks[0].command).toBe('node "${CLAUDE_PLUGIN_ROOT}/hooks/websearch-gate.ts"');
  });
});
