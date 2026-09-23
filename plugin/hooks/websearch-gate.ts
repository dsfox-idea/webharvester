// PreToolUse hook for WebSearch: web search goes through the growser MCP server, so the built-in tool is denied.
const reason =
  'WebSearch is disabled by the web-harvester plugin: web search goes through the user\'s Growser. ' +
  'Use mcp__plugin_web-harvester_growser__web_search instead (load its schema with ToolSearch if it is deferred). ' +
  'If it fails, report the error to the user instead of looking for another search route.';

process.stdout.write(
  JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }),
);
