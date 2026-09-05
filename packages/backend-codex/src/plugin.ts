import {
	type AgentBackend,
	type AntumbraPlugin,
	type BackendCapacitySource,
	type BackendFailure,
	makeBackendCapacityController,
	type PluginContext,
} from "@antumbra/plugin-api";
import { Effect, Option, RcRef } from "effect";
import { bundledCodex } from "#adapters/chatgpt-bundle.ts";
import { type LineProcess, spawnLineProcess } from "#adapters/process.ts";
import { codexAudit } from "#adapters/thread-audit.ts";
import { classifyCodexCapacity } from "#capacity.ts";
import { listCodexModels } from "#models.ts";
import { type CodexServer, makeCodexServer } from "#server.ts";
import { openThreadSession } from "#thread.ts";

interface CodexPluginOptions {
	readonly cwd: string;
}

const spawnAppServer = (command: string, cwd: string) => (): LineProcess => spawnLineProcess({ args: ["app-server"], command, cwd });

const codexBackend = (server: RcRef.RcRef<CodexServer, BackendFailure>, capacity: BackendCapacitySource): AgentBackend => ({
	audit: codexAudit(server),
	capacity,
	capabilities: {
		imageInput: true,
	},
	listModels: RcRef.get(server).pipe(Effect.flatMap(listCodexModels), Effect.scoped),
	openSession: (options) => RcRef.get(server).pipe(Effect.flatMap((live) => openThreadSession(live, options))),
	tag: "codex",
});

const codexCommand = (context: PluginContext) =>
	Effect.flatMap(context.findExecutable("codex"), (found) => (Option.isSome(found) ? Effect.succeed(found) : bundledCodex));

const registerCodex = (context: PluginContext, spawn: () => LineProcess) =>
	Effect.gen(function* () {
		const capacity = yield* makeBackendCapacityController(classifyCodexCapacity);
		const server = yield* RcRef.make({
			acquire: makeCodexServer({ observeCapacity: capacity.observe, spawn }),
		});
		yield* context.registerAgentBackend(codexBackend(server, capacity.source));
	});

export const codexPlugin = (options: CodexPluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			codexCommand(context),
			Option.match({
				onNone: () => Effect.logWarning("codex: no executable found on the login PATH or in the ChatGPT app; backend not registered"),
				onSome: (command) => registerCodex(context, spawnAppServer(command, options.cwd)),
			}),
		),
	name: "codex",
});
