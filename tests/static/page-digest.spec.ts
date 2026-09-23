import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { ClaudeCliDigest } from '../../plugin/server/page-digest.ts';
import type { PageSnapshot } from '../../plugin/server/page-scripts.ts';

const page: PageSnapshot = {
  url: 'https://docs.example/a',
  title: 'Docs',
  contentType: 'text/html',
  text: '# Heading\n\nBody with 386 hp.',
  scope: 'main',
  links: [],
  challengeFrame: false,
};

/** A stand-in for the Claude Code CLI: prints what `mode` asks for and echoes its arguments and stdin. */
const writeFakeCli = (path: string): void =>
  writeFileSync(
    path,
    `let input = '';
process.stdin.setEncoding('utf8').on('data', (chunk) => (input += chunk)).on('end', () => {
  const args = process.argv.slice(3);
  const mode = process.argv[2];
  if (mode === 'crash') { process.stderr.write('boom on stderr'); process.exit(3); }
  if (mode === 'error') { process.stdout.write(JSON.stringify({ is_error: true, result: 'Credit balance is too low' })); return; }
  process.stdout.write(JSON.stringify({ is_error: false, result: JSON.stringify({ args, input }), modelUsage: { 'claude-haiku-4-5-20251001': {} } }));
});
`,
  );

test.describe('ClaudeCliDigest', () => {
  test('asks Haiku through claude -p in safe mode, without tools, with the page on stdin', async ({}, testInfo) => {
    const script = testInfo.outputPath('fake-claude.mjs');
    writeFakeCli(script);
    const answer = await new ClaudeCliDigest(process.execPath, [script, 'ok']).answer('How strong is it?', page);
    expect(answer.model).toBe('claude-haiku-4-5-20251001');
    const echoed = JSON.parse(answer.text) as { args: string[]; input: string };
    expect(echoed.args).toEqual(ClaudeCliDigest.arguments('How strong is it?'));
    expect(echoed.args).toEqual(expect.arrayContaining(['-p', '--safe-mode', '--no-session-persistence']));
    expect(echoed.args.slice(echoed.args.indexOf('--model'), echoed.args.indexOf('--model') + 2)).toEqual(['--model', 'haiku']);
    expect(echoed.args.slice(echoed.args.indexOf('--tools'), echoed.args.indexOf('--tools') + 2)).toEqual(['--tools', '']);
    expect(echoed.input).toBe('Title: Docs\nURL: https://docs.example/a\n\n# Heading\n\nBody with 386 hp.');
  });

  test('marks a page cut at the size limit', () => {
    const header = 'Title: Docs\nURL: https://docs.example/a\n\n';
    const input = ClaudeCliDigest.input({ ...page, text: 'x'.repeat(ClaudeCliDigest.maxPageChars + 10) });
    expect(input).toBe(`${header}${'x'.repeat(ClaudeCliDigest.maxPageChars)}\n\n[page truncated]`);
    expect(ClaudeCliDigest.input({ ...page, text: 'short' })).toBe(`${header}short`);
  });

  test('reports an error answer, a crash with its stderr, and a missing CLI', async ({}, testInfo) => {
    const script = testInfo.outputPath('fake-claude.mjs');
    writeFakeCli(script);
    await expect(new ClaudeCliDigest(process.execPath, [script, 'error']).answer('q', page)).rejects.toThrow(/haiku could not answer: Credit balance is too low/);
    await expect(new ClaudeCliDigest(process.execPath, [script, 'crash']).answer('q', page)).rejects.toThrow(/haiku could not answer: exit 3, boom on stderr/);
    await expect(new ClaudeCliDigest('definitely-not-a-claude-cli').answer('q', page)).rejects.toThrow(/Could not start the Claude Code CLI .*set CLAUDE_CLI_PATH/);
  });
});
