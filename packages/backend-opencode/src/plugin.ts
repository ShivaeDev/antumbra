import type { AntumbraPlugin } from "@antumbra/plugin-api";
import { Effect, Option, RcRef } from "effect";
import { serveOpencode } from "#adapters/serve.ts";
import { opencodeBackend } from "#backend.ts";
import { makeOpencodeServer } from "#server.ts";

export interface OpencodePluginOptions {
	readonly cwd: string;
}

export const opencodePlugin = (options: OpencodePluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			context.findExecutable("opencode"),
			Option.match({
				onNone: () => Effect.logWarning("opencode: no executable found on the login PATH; backend not registered"),
				onSome: (command) =>
					Effect.flatMap(RcRef.make({ acquire: makeOpencodeServer(serveOpencode({ command, cwd: options.cwd })) }), (server) =>
						context.registerAgentBackend(opencodeBackend(server)),
					),
			}),
		),
	name: "opencode",
});
