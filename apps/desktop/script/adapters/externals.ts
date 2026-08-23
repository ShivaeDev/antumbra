// why: electron is handed to the main process by the host and must never be
// bundled. The other two carry native code they find relative to their own
// module path — the agent SDK reaches for its platform binary, and sharp
// resolves an @img/sharp-<platform> prebuild the same way. Inlined, both would
// look for a .node file beside out/main.js, where nothing ever puts one, so
// they stay runtime imports and travel in the packaged node_modules instead.
// Anything added here must also be a production dependency of this app, or
// electron-builder will not pack it.
export const MAIN_EXTERNALS = [
	"@anthropic-ai/claude-agent-sdk",
	"electron",
	"sharp",
];
