import type {
	AgentBackend,
	AntumbraPlugin,
	BackendFailure,
	PluginContext,
} from "@antumbra/plugin-api";
import { Effect, Option, RcRef } from "effect";
import { bundledCodex } from "#adapters/chatgpt-bundle.ts";
import { type LineProcess, spawnLineProcess } from "#adapters/process.ts";
import { codexAudit } from "#adapters/thread-audit.ts";
import { type CodexServer, makeCodexServer } from "#server.ts";
import { openThreadSession } from "#thread.ts";

export interface CodexPluginOptions {
	readonly cwd: string;
}

// why: how a child is started, handed round rather than the path it was
// resolved from — the live server takes one and so does an audit, which opens a
// child of its own for the one question it asks.
const spawnAppServer = (command: string, cwd: string) => (): LineProcess =>
	spawnLineProcess({ args: ["app-server"], command, cwd });

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
		imageInput: true,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession: (options) =>
		RcRef.get(server).pipe(
			Effect.flatMap((live) => openThreadSession(live, options)),
		),
	tag: "codex",
});

// why: what the login shell answers with wins — a codex the user installed is
// the one they expect to drive; the app bundle is the fallback for a machine
// where only ChatGPT put one there.
const codexCommand = (context: PluginContext) =>
	Effect.flatMap(context.findExecutable("codex"), (found) =>
		Option.isSome(found) ? Effect.succeed(found) : bundledCodex,
	);

// why: the child is reference-counted, not per session — it starts with the
// first session, is shared by every one after, and is killed when the last
// closes; the plugin scope bounds it either way.
const registerCodex = (context: PluginContext, spawn: () => LineProcess) =>
	Effect.gen(function* () {
		const server = yield* RcRef.make({ acquire: makeCodexServer({ spawn }) });
		yield* context.registerAgentBackend(codexBackend(server, spawn));
	});

export const codexPlugin = (options: CodexPluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			codexCommand(context),
			Option.match({
				onNone: () =>
					Effect.logWarning(
						"codex: no executable found on the login PATH or in the ChatGPT app; backend not registered",
					),
				onSome: (command) =>
					registerCodex(context, spawnAppServer(command, options.cwd)),
			}),
		),
	name: "codex",
});
