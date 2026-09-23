// PreToolUse hook for WebSearch and WebFetch: the web is reached through the growser MCP server, so the
// built-in tools are denied and the model is pointed at their replacements.
const replacements: Record<string, string> = {
  WebSearch: 'mcp__plugin_web-harvester_growser__web_search',
  WebFetch: 'mcp__plugin_web-harvester_growser__web_fetch',
};

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => (input += chunk));
process.stdin.on('end', () => {
  let toolName = 'this tool';
  try {
    toolName = (JSON.parse(input) as { tool_name?: string }).tool_name ?? toolName;
  } catch {
    // An unreadable payload still gets denied, with both replacements named.
  }
  const replacement = replacements[toolName] ?? Object.values(replacements).join(' or ');
  const reason =
    `${toolName} is disabled by the web-harvester plugin: the web is reached through the user's Growser. ` +
    `Use ${replacement} instead (load its schema with ToolSearch if it is deferred). ` +
    'If it fails, report the error to the user instead of looking for another route.';
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }),
  );
});
