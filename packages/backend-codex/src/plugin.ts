import type {
	AgentBackend,
	AntumbraPlugin,
	BackendFailure,
} from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import { spawnLineProcess } from "#adapters/process.ts";
import { type CodexServer, makeCodexServer } from "#server.ts";
import { openThreadSession } from "#thread.ts";

export interface CodexPluginOptions {
	// why: the app-server binary is whatever `codex` the host resolves; the
	// desktop shell decides the path, the backend never guesses one.
	readonly command: string;
	readonly cwd: string;
}

// why: multiClient stays false over stdio — the protocol fans out to
// several clients only behind a websocket listener, which nothing here
// consumes yet; reporting the protocol's ability would be a lie about ours.
export const codexBackend = (
	server: RcRef.RcRef<CodexServer, BackendFailure>,
): AgentBackend => ({
	capabilities: {
		fork: true,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession: (options) =>
		RcRef.get(server).pipe(
			Effect.flatMap((live) => openThreadSession(live, options)),
		),
	tag: "codex",
});

// why: the child is reference-counted, not per session — it starts with the
// first session, is shared by every one after, and is killed when the last
// closes; the plugin scope bounds it either way.
export const codexPlugin = (options: CodexPluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.gen(function* () {
			const server = yield* RcRef.make({
				acquire: makeCodexServer({
					spawn: () =>
						spawnLineProcess({
							args: ["app-server"],
							command: options.command,
							cwd: options.cwd,
						}),
				}),
			});
			yield* context.registerAgentBackend(codexBackend(server));
		}),
	name: "codex",
});
