import type { capacityObserved } from "@antumbra/domain-capacity/facts/observed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as capacitySelection } from "@antumbra/server-storage/records/capacity.ts";
import { Effect, Option } from "effect";
import { Records } from "#records.ts";

const severity = { available: 0, warning: 1, blocked: 2 };

export const observed = Effect.fn("capacity.observed")(function* (fact: FactValue<typeof capacityObserved>): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const current = yield* rows.capacity
		.findOne({ where: { backend: fact.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: capacitySelection })
		.pipe(Effect.orDie);
	if (Option.isSome(current)) {
		const prior = current.value;
		const comparison = prior.observedAt - fact.observedAt;
		if (comparison > 0 || (comparison === 0 && severity[prior.status] >= severity[fact.status])) return;
		if (prior.status === "blocked" && fact.status !== "blocked") return;
	}
	const limited = fact.status !== "available";
	const value = {
		backend: fact.backend,
		status: fact.status,
		observedAt: fact.observedAt,
		reason: limited ? fact.reason : null,
		detail: limited ? fact.detail : null,
		resetsAt: limited ? fact.resetsAt : null,
		utilization: limited ? fact.utilization : null,
	};
	if (Option.isNone(current)) return yield* rows.capacity.insertVoid(value).pipe(Effect.orDie);
	yield* rows.capacity.updateVoid({ ...value, backend: fact.backend }).pipe(Effect.orDie);
});
