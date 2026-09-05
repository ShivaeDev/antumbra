import { Clock, Effect, type Semaphore } from "effect";
import { CapacitySources } from "#sources.ts";
import { clearStoredCapacity } from "#writes.ts";

export const clearCapacity = (writes: Semaphore.Semaphore) =>
	Effect.fn("BackendCapacities.clear")(function* (backend: string) {
		const sources = yield* CapacitySources;
		const source = sources.get(backend)?.capacity;
		const observedAt = source === undefined ? yield* Clock.currentTimeMillis : yield* source.clear;
		yield* clearStoredCapacity(writes)(backend, observedAt);
	});
