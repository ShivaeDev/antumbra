import { RunnerLog } from "@antumbra/runner-fabric/log.ts";
import { Effect } from "effect";
import { RunnerClient } from "#connection.ts";

export const flushLog = Effect.fn("Runner.flushLog")(function* () {
	const { calls } = yield* RunnerClient;
	const log = yield* RunnerLog;
	const cursor = yield* calls["runner.cursor"]({ logId: log.logId });
	const entries = yield* log.read(cursor);
	return entries.length === 0 ? cursor : yield* calls["runner.append"]({ logId: log.logId, entries });
});
