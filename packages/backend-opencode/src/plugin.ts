import type { AntumbraPlugin, PluginContext, ToolDefinition } from "@antumbra/plugin-api";
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

const registerOpencode = (context: PluginContext, command: string, options: OpencodePluginOptions) =>
	Effect.gen(function* () {
		const sessions = makeToolSessions(options.tools.map((tool) => tool.name));
		const tools = yield* serveToolRequests(answerToolRequest(options.tools, sessions));
		const liveServer = (constrained: boolean) =>
			makeOpencodeServer(
				Effect.provide(
					serveOpencode({ command, constrained, cwd: options.cwd, plugin: options.plugin, skills: skillFolders(options.skills), tools }),
					NodeServices.layer,
				),
				sessions,
			);
		const ordinary = yield* RcRef.make({ acquire: liveServer(false) });
		const constrained = yield* RcRef.make({ acquire: liveServer(true) });
		yield* context.registerAgentBackend(opencodeBackend({ constrained, ordinary }));
	});

export const opencodePlugin = (options: OpencodePluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			context.findExecutable("opencode"),
			Option.match({
				onNone: () => Effect.logWarning("opencode: no executable found on the login PATH; backend not registered"),
				onSome: (command) => registerOpencode(context, command, options),
			}),
		),
	name: "opencode",
});
