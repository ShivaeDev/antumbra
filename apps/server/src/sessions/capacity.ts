import { retry } from "@antumbra/domain-sessions/commands/retry.ts";
import { capacityReleased } from "@antumbra/domain-sessions/queries/capacity-released.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import { Effect } from "effect";
import { watchKeys } from "#supervision/keys.ts";
export const resumeCapacity = Effect.fn("Sessions.resumeCapacity")(function* () {
	const commit = yield* Commit;
	return yield* each({
		keys: watchKeys(capacityReleased.reads, capacityReleased.scope?.({})),
		read: Live.use((live) => live.read(capacityReleased, {})),
		key: (operation) => operation.id,
		act: (operation) =>
			commit
				.commit(retry, { id: operation.id, requestId: Request.make(`${operation.id}:capacity-released`) })
				.pipe(Effect.asVoid, Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void })),
	});
});
