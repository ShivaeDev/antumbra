import { capacityReleased } from "@antumbra/domain-sessions/queries/capacity-released.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import { Effect } from "effect";
import { watchKeys } from "#supervision/keys.ts";
export const resumeCapacity = Effect.fn("Sessions.resumeCapacity")(function* () {
	const sessionsService = yield* Sessions;

	return yield* each({
		keys: watchKeys(capacityReleased.reads, capacityReleased.scope?.({})),
		read: sessionsService.capacityReleased({}).pipe(Effect.orDie),
		key: (operation) => operation.id,
		act: (operation) =>
			sessionsService
				.retry({ id: operation.id, requestId: Request.make(`${operation.id}:capacity-released`) })
				.pipe(Effect.asVoid, Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void })),
	});
});
