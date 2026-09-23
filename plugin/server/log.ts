/** MCP owns stdout, so every diagnostic goes to stderr under one prefix. */
export const log = (...parts: unknown[]): void => console.error('[growser-mcp]', ...parts);
