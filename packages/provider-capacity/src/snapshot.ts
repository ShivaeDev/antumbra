import { Effect, type Semaphore } from "effect";
import { currentCapacity } from "#current.ts";
import { CapacitySources } from "#sources.ts";

export const capacitySnapshot = (writes: Semaphore.Semaphore) =>
	Effect.fn("BackendCapacities.snapshot")(function* () {
		const sources = yield* CapacitySources;
		return yield* Effect.forEach([...sources.keys()], currentCapacity(writes), { concurrency: 1 });
	});
