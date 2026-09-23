// PreToolUse hook for WebSearch and WebFetch: the web is reached through the growser MCP server, so the
// built-in tools are denied and the model is pointed at their replacements. The one exception: a Growser
// tool met a human check that did not clear and granted a FallbackPass for that search or site.
import { FallbackPass } from '../server/fallback-pass.ts';

const replacements: Record<string, string> = {
  WebSearch: 'mcp__plugin_web-harvester_growser__web_search',
  WebFetch: 'mcp__plugin_web-harvester_growser__web_fetch',
};

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => (input += chunk));
process.stdin.on('end', () => {
  let toolName = 'this tool';
  let url: unknown;
  try {
    const payload = JSON.parse(input) as { tool_name?: string; tool_input?: { url?: unknown } };
    toolName = payload.tool_name ?? toolName;
    url = payload.tool_input?.url;
  } catch {
    // An unreadable payload still gets denied, with both replacements named.
  }
  if (new FallbackPass().allows(toolName, FallbackPass.hostOf(url))) return; // no decision: the usual permissions apply
  const replacement = replacements[toolName] ?? Object.values(replacements).join(' or ');
  const reason =
    `${toolName} is disabled by the web-harvester plugin: the web is reached through the user's Growser. ` +
    `Use ${replacement} instead (load its schema with ToolSearch if it is deferred). ` +
    'The built-in tool opens only after that tool reports a human check that did not clear within 15 s. ' +
    'If it fails for another reason, report the error to the user instead of looking for another route.';
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }),
  );
});
