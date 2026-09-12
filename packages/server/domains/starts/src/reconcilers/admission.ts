import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { run } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import { admit } from "#commands/admit.ts";
import { pending } from "#queries/pending.ts";
export const admission = Effect.gen(function* () {
	const commit = yield* Commit;
	return yield* run(
		pending,
		{},
		Effect.fn("Starts.admission")(function* (rows) {
			for (const held of rows) {
				yield* commit.commit(admit, { id: held.id, requestId: Request.make(`admit:${held.operationRequestId}`) }).pipe(
					Effect.catchTags({
						AlreadyDone: () => Effect.void,
						Unknown: () => Effect.void,
						NotRequested: () => Effect.void,
						Held: () => Effect.void,
						NoSlot: () => Effect.void,
						NotOldest: () => Effect.void,
					}),
				);
			}
		}),
	);
});
