import { providers } from "@antumbra/domain-capacity/queries.ts";
import { holdCapacity } from "@antumbra/domain-sessions/commands/hold.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
export const capacityAvailable = Effect.fn("Sessions.capacityAvailable")(function* (operation: typeof sessionOperation.Row.Type, backend: string) {
	if (operation.kind !== "wake" && operation.kind !== "steer") return true;
	const live = yield* Live;
	const capacities = yield* live.read(providers, {});
	const capacity = capacities.find((value) => value.backend === backend);
	if (capacity?.status !== "blocked") return true;
	const commit = yield* Commit;
	yield* commit
		.commit(holdCapacity, {
			id: operation.id,
			backend,
			detail: capacity.detail ?? "Provider capacity is blocked",
			requestId: Request.make(`${operation.id}:held`),
		})
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	return false;
});
