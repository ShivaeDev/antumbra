import { retry } from "@antumbra/domain-sessions/commands/retry.ts";
import { capacityReleased } from "@antumbra/domain-sessions/queries/capacity-released.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { each } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
export const resumeCapacity = Effect.fn("Sessions.resumeCapacity")(function* () {
	const commit = yield* Commit;
	return yield* each(
		capacityReleased,
		{},
		(operation) => operation.id,
		(operation) =>
			commit
				.commit(retry, { id: operation.id, requestId: Request.make(`${operation.id}:capacity-released`) })
				.pipe(Effect.asVoid, Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void })),
	);
});
