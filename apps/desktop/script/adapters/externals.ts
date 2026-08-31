// Electron comes from the host and remains a development dependency. The agent SDK and Sharp resolve native binaries relative to their module paths.
// Any packaged external added here must be a production dependency for electron-builder to include it.
export const MAIN_EXTERNALS = ["@anthropic-ai/claude-agent-sdk", "electron", "sharp"];
