import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option } from "effect";
import { capacityReleased } from "#facts/released.ts";
import { capacity } from "#rows/capacity.ts";

export const released = materializer(capacityReleased, {
	writes: [capacity],
	run: Effect.fn("capacity.released")(function* (fact, rows) {
		const current = yield* rows.capacity.find(fact.backend);
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
		if (Option.isNone(current)) return yield* rows.capacity.insert(value);
		yield* rows.capacity.update(fact.backend, value);
	}),
});
