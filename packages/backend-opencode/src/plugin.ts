import type { AntumbraPlugin, PluginContext } from "@antumbra/plugin-api";
import { Effect, Option, RcRef } from "effect";
import type { OpencodeConnection } from "#adapters/connection.ts";
import { serveOpencode } from "#adapters/serve.ts";
import { opencodeBackend } from "#backend.ts";
import { makeOpencodeServer } from "#server.ts";

export interface OpencodePluginOptions {
	readonly cwd: string;
}

// why: the child is reference-counted, not per session — it starts with the
// first session, is shared by every one after, and is killed when the last
// closes; the plugin scope bounds it either way.
const registerOpencode = (
	context: PluginContext,
	connect: () => Promise<OpencodeConnection>,
) =>
	Effect.gen(function* () {
		const server = yield* RcRef.make({ acquire: makeOpencodeServer(connect) });
		yield* context.registerAgentBackend(opencodeBackend(server));
	});

// why: Antumbra drives the CLI the user installed and bundles none — the
// backend is offered only when one is found, because a backend that cannot
// spawn is not a backend.
export const opencodePlugin = (
	options: OpencodePluginOptions,
): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			context.findExecutable("opencode"),
			Option.match({
				onNone: () =>
					Effect.logWarning(
						"opencode: no executable found on the login PATH; backend not registered",
					),
				onSome: (command) =>
					registerOpencode(
						context,
						serveOpencode({ command, cwd: options.cwd }),
					),
			}),
		),
	name: "opencode",
});
