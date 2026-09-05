import type { AntumbraPlugin, ToolDefinition } from "@antumbra/plugin-api";
import { skillFolders } from "@antumbra/skills";
import { NodeServices } from "@effect/platform-node";
import { Effect, Option, RcRef } from "effect";
import { serveOpencode } from "#adapters/serve.ts";
import { serveToolRequests } from "#adapters/tool-endpoint.ts";
import { answerToolRequest } from "#adapters/tool-server.ts";
import { opencodeBackend } from "#backend.ts";
import { makeOpencodeServer } from "#server.ts";
import { makeToolSessions } from "#tool-sessions.ts";

interface OpencodePluginOptions {
	readonly cwd: string;
	readonly plugin: string;
	readonly skills: string;
	readonly tools: ReadonlyArray<ToolDefinition>;
}

const liveServer = (command: string, options: OpencodePluginOptions) =>
	Effect.gen(function* () {
		const sessions = makeToolSessions(options.tools.map((tool) => tool.name));
		const tools = yield* serveToolRequests(answerToolRequest(options.tools, sessions));
		const serve = serveOpencode({ command, cwd: options.cwd, plugin: options.plugin, skills: skillFolders(options.skills), tools });
		return yield* makeOpencodeServer(Effect.provide(serve, NodeServices.layer), sessions);
	});

export const opencodePlugin = (options: OpencodePluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			context.findExecutable("opencode"),
			Option.match({
				onNone: () => Effect.logWarning("opencode: no executable found on the login PATH; backend not registered"),
				onSome: (command) =>
					Effect.flatMap(RcRef.make({ acquire: liveServer(command, options) }), (server) => context.registerAgentBackend(opencodeBackend(server))),
			}),
		),
	name: "opencode",
});
