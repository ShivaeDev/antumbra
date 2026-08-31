// Electron comes from the host. The agent SDK and Sharp resolve native binaries relative to their module paths, so they remain runtime imports.
// Every external must be a production dependency for electron-builder to pack it.
export const MAIN_EXTERNALS = ["@anthropic-ai/claude-agent-sdk", "electron", "sharp"];
