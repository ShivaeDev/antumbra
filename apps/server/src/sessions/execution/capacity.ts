import { providers } from "@antumbra/domain-capacity/queries.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { holdOperation } from "#sessions/execution/hold.ts";
export const capacityAvailable = Effect.fn("Sessions.capacityAvailable")(function* (operation: typeof sessionOperation.Row.Type, backend: string) {
	if (operation.kind !== "wake" && operation.kind !== "steer") return true;
	const live = yield* Live;
	const capacities = yield* live.read(providers, {});
	const capacity = capacities.find((value) => value.backend === backend);
	if (capacity?.status !== "blocked") return true;
	yield* holdOperation(operation.id, capacity.detail ?? "Provider capacity is blocked");
	return false;
});
