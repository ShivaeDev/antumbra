import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option } from "effect";
import { capacityObserved, capacityReleased } from "#facts.ts";
import { capacity } from "#rows/capacity.ts";

const severity = { available: 0, warning: 1, blocked: 2 };

export const observed = materializer(capacityObserved, {
	writes: [capacity],
	run: Effect.fn("capacity.observed")(function* (fact, rows) {
		const current = yield* rows.capacity.find(fact.backend);
		if (Option.isSome(current)) {
			const prior = current.value;
			const comparison = (prior.observedAt ?? 0) - fact.observedAt;
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
		if (Option.isNone(current)) return yield* rows.capacity.insert(value);
		yield* rows.capacity.update(fact.backend, value);
	}),
});

export const released = materializer(capacityReleased, {
	writes: [capacity],
	run: Effect.fn("capacity.released")(function* (fact, rows) {
		const current = yield* rows.capacity.find(fact.backend);
		if (Option.isSome(current) && (current.value.observedAt ?? 0) > fact.at) return;
		const value = {
			backend: fact.backend,
			status: "available" as const,
			observedAt: fact.at,
			reason: null,
			detail: null,
			resetsAt: null,
			utilization: null,
		};
		if (Option.isNone(current)) return yield* rows.capacity.insert(value);
		yield* rows.capacity.update(fact.backend, value);
	}),
});
