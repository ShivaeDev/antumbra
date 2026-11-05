import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Lifecycle } from "@antumbra/server-lifecycle/service.ts";
import { Effect } from "effect";

export const recordRestart = Effect.fn("Lifecycle.recordRestart")(function* ({ requestId }: { readonly requestId: string }) {
	const lifecycleService = yield* Lifecycle;

	const runners = yield* RunnerOperations;
	yield* lifecycleService
		.record({ requestId: Request.make(requestId), runnerIds: (yield* runners.connected).map((runner) => runner.runnerId) })
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});
