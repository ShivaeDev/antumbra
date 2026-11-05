import type * as Source from "@antumbra/domain-sessions/queries/capacity-released.ts";
import { selection as capacitySelection } from "@antumbra/server-storage/records/capacity.ts";
import { selection as sessionCapacityWaitSelection } from "@antumbra/server-storage/records/session-capacity-wait.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const capacityReleased = Effect.fn("Sessions.capacityReleased")(function* (
	_input: Schema.Struct.Type<typeof Source.capacityReleased.input>,
): Effect.fn.Return<typeof Source.capacityReleased.output.Type, never, Records> {
	const rows = yield* Records;

	const providers = yield* rows.capacity
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: capacitySelection })
		.pipe(Effect.orDie);
	const holds = yield* rows.sessionCapacityWait
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionCapacityWaitSelection })
		.pipe(Effect.orDie);
	const waiting = yield* rows.sessionOperation
		.findMany({ where: { status: "waiting" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	return waiting.filter((operation) => {
		const hold = holds.find((held) => held.id === operation.id);
		return hold !== undefined && providers.some((provider) => provider.backend === hold.backend && provider.status !== "blocked");
	});
});
