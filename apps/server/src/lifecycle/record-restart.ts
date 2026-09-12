import { record } from "@antumbra/domain-lifecycle/commands/record.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";

export const recordRestart = Effect.fn("Lifecycle.recordRestart")(function* ({ requestId }: { readonly requestId: string }) {
	const commit = yield* Commit;
	const runners = yield* RunnerOperations;
	yield* commit
		.commit(record, { requestId: Request.make(requestId), runnerIds: (yield* runners.connected).map((runner) => runner.runnerId) })
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});
