import { LifecycleRefused } from "@antumbra/domain-lifecycle/commands/restart.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Effect } from "effect";

const drainRunner = Effect.fn("Lifecycle.drainRunner")(function* (runnerId: string, requestId: string) {
	const runners = yield* RunnerOperations;
	const result = yield* runners.execute(runnerId, { type: "Drain", requestId: `${requestId}:${runnerId}` });
	if (result.type === "Accepted") return;
	const message = result.type === "Refused" ? result.reason : `Runner ${runnerId} did not acknowledge drain`;
	return yield* Effect.fail(new LifecycleRefused({ message }));
});

export const drain = Effect.fn("Lifecycle.drain")(function* ({ requestId }: { readonly requestId: string }) {
	const runners = yield* RunnerOperations;
	const connected = yield* runners.connected;
	yield* Effect.forEach(connected, (runner) => drainRunner(runner.runnerId, requestId), { concurrency: "unbounded" });
});
