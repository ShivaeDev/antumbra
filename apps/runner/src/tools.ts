import { RunnerLog } from "@antumbra/runner-fabric/log.ts";
import { ServerTools } from "@antumbra/runner-fabric/ports.ts";
import { Effect, Layer } from "effect";
import { connected, RunnerClient } from "#connection.ts";
import { flushLog } from "#publish.ts";

export const serverTools = (logId: string) =>
	Layer.effect(
		ServerTools,
		Effect.gen(function* () {
			const client = yield* RunnerClient;
			const log = yield* RunnerLog;
			return {
				call: (call) =>
					connected(flushLog(logId).pipe(Effect.andThen(client.calls["runner.tool"](call)))).pipe(
						Effect.provideService(RunnerClient, client),
						Effect.provideService(RunnerLog, log),
						Effect.orDie,
					),
			};
		}),
	);
