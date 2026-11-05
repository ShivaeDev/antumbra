import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Capacity } from "@antumbra/server-capacity/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { Effect } from "effect";
export const capacityAvailable = Effect.fn("Sessions.capacityAvailable")(function* (operation: typeof sessionOperation.Row.Type, backend: string) {
	const capacityService = yield* Capacity;
	const sessionsService = yield* Sessions;

	if (operation.kind !== "wake" && operation.kind !== "steer") return true;

	const capacities = yield* capacityService.providers({}).pipe(Effect.orDie);
	const capacity = capacities.find((value) => value.backend === backend);
	if (capacity?.status !== "blocked") return true;

	yield* sessionsService
		.holdCapacity({
			id: operation.id,
			backend,
			detail: capacity.detail ?? "Provider capacity is blocked",
			requestId: Request.make(`${operation.id}:held`),
		})
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	return false;
});
