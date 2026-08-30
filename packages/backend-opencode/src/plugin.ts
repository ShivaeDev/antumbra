import type { AntumbraPlugin, PluginContext } from "@antumbra/plugin-api";
import { Effect, Option, RcRef } from "effect";
import type { OpencodeConnection } from "#adapters/connection.ts";
import { serveOpencode } from "#adapters/serve.ts";
import { opencodeBackend } from "#backend.ts";
import { makeOpencodeServer } from "#server.ts";

export interface OpencodePluginOptions {
	readonly cwd: string;
}

const registerOpencode = (context: PluginContext, connect: () => Promise<OpencodeConnection>) =>
	Effect.gen(function* () {
		const server = yield* RcRef.make({ acquire: makeOpencodeServer(connect) });
		yield* context.registerAgentBackend(opencodeBackend(server));
	});

export const opencodePlugin = (options: OpencodePluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			context.findExecutable("opencode"),
			Option.match({
				onNone: () => Effect.logWarning("opencode: no executable found on the login PATH; backend not registered"),
				onSome: (command) => registerOpencode(context, serveOpencode({ command, cwd: options.cwd })),
			}),
		),
	name: "opencode",
});
