import type { AntumbraPlugin } from "@antumbra/plugin-api";
import { skillFolders } from "@antumbra/skills";
import { NodeServices } from "@effect/platform-node";
import { Effect, Option, RcRef } from "effect";
import { serveOpencode } from "#adapters/serve.ts";
import { opencodeBackend } from "#backend.ts";
import { makeOpencodeServer } from "#server.ts";

interface OpencodePluginOptions {
	readonly cwd: string;
	readonly skills: string;
}

export const opencodePlugin = (options: OpencodePluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			context.findExecutable("opencode"),
			Option.match({
				onNone: () => Effect.logWarning("opencode: no executable found on the login PATH; backend not registered"),
				onSome: (command) => {
					const serve = serveOpencode({ command, cwd: options.cwd, skills: skillFolders(options.skills) });
					return Effect.flatMap(RcRef.make({ acquire: makeOpencodeServer(Effect.provide(serve, NodeServices.layer)) }), (server) =>
						context.registerAgentBackend(opencodeBackend(server)),
					);
				},
			}),
		),
	name: "opencode",
});
