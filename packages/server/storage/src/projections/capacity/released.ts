import type { capacityReleased } from "@antumbra/domain-capacity/facts/released.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as capacitySelection } from "@antumbra/server-storage/records/capacity.ts";
import { Effect, Option } from "effect";
import { Records } from "#records.ts";

export const released = Effect.fn("capacity.released")(function* (fact: FactValue<typeof capacityReleased>): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const current = yield* rows.capacity
		.findOne({ where: { backend: fact.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: capacitySelection })
		.pipe(Effect.orDie);
	if (Option.isSome(current) && current.value.observedAt > fact.at) return;
	const value = {
		backend: fact.backend,
		status: "available" as const,
		observedAt: fact.at,
		reason: null,
		detail: null,
		resetsAt: null,
		utilization: null,
	};
	if (Option.isNone(current)) return yield* rows.capacity.insertVoid(value).pipe(Effect.orDie);
	yield* rows.capacity.updateVoid({ ...value, backend: fact.backend }).pipe(Effect.orDie);
});
