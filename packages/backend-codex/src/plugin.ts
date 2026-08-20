import type {
	AgentBackend,
	AntumbraPlugin,
	BackendFailure,
} from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import { type LineProcess, spawnLineProcess } from "#adapters/process.ts";
import { codexAudit } from "#adapters/thread-audit.ts";
import { type CodexServer, makeCodexServer } from "#server.ts";
import { openThreadSession } from "#thread.ts";

export interface CodexPluginOptions {
	// why: the app-server binary is whatever `codex` the host resolves; the
	// desktop shell decides the path, the backend never guesses one.
	readonly command: string;
	readonly cwd: string;
}

// why: how a child is started, handed round rather than the path it was
// resolved from — the live server takes one and so does an audit, which opens a
// child of its own for the one question it asks.
const spawnAppServer = (options: CodexPluginOptions) => (): LineProcess =>
	spawnLineProcess({
		args: ["app-server"],
		command: options.command,
		cwd: options.cwd,
	});

// why: multiClient stays false over stdio — the protocol fans out to
// several clients only behind a websocket listener, which nothing here
// consumes yet; reporting the protocol's ability would be a lie about ours.
export const codexBackend = (
	server: RcRef.RcRef<CodexServer, BackendFailure>,
	spawn: () => LineProcess,
): AgentBackend => ({
	audit: codexAudit(server, spawn),
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
			const spawn = spawnAppServer(options);
			const server = yield* RcRef.make({
				acquire: makeCodexServer({ spawn }),
			});
			yield* context.registerAgentBackend(codexBackend(server, spawn));
		}),
	name: "codex",
});
