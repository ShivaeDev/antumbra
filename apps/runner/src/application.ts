import { layer as fabric } from "@antumbra/runner-fabric/fabric.ts";
import { file } from "@antumbra/runner-fabric/log.ts";
import { BackendRegistry, InputResolver, RunnerIdentity } from "@antumbra/runner-fabric/ports.ts";
import type { AgentBackend } from "@antumbra/runner-ports/backend.ts";
import { Effect, Layer } from "effect";
import { resolveInput } from "#adapters/inputs.ts";
import { runnerPaths } from "#adapters/paths.ts";
import { connection, serverTools } from "#connection.ts";
import type { Options } from "#options.ts";
import { makeLocalRunner } from "#resources.ts";
import { runRunner } from "#run.ts";

export const application = (options: Options, backends: ReadonlyMap<string, AgentBackend>) =>
	Effect.gen(function* () {
		const paths = yield* runnerPaths(options.directory);
		const client = connection(options.url, options.token);
		const log = file({ filename: paths.filename, logId: options.logId });
		const services = Layer.mergeAll(
			log,
			client,
			serverTools.pipe(Layer.provide(client)),
			Layer.succeed(BackendRegistry, { backends }),
			Layer.succeed(InputResolver, { resolve: (input) => resolveInput(paths.inputs, input).pipe(Effect.orDie) }),
			Layer.succeed(RunnerIdentity, { runnerId: options.runnerId }),
		);
		return yield* runRunner({ runnerId: options.runnerId, logId: options.logId, backends: [...backends.keys()] }, makeLocalRunner(paths)).pipe(
			Effect.provide(fabric.pipe(Layer.provideMerge(services))),
		);
	});
