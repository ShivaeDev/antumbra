import { Database } from "@antumbra/persistence";
import type { BackendCapacityObservation } from "@antumbra/plugin-api";
import { Effect, Option, type Semaphore } from "effect";
import { defaultCapacityReading, storedCapacityReading } from "#model.ts";
import { CapacitySources } from "#sources.ts";
import { observeCapacity } from "#writes.ts";

export const currentCapacity = (writes: Semaphore.Semaphore) =>
	Effect.fn("BackendCapacities.current")(function* (backend: string) {
		const sources = yield* CapacitySources;
		const db = yield* Database;
		const native = yield* sources.get(backend)?.capacity?.current ?? Effect.succeed(Option.none<BackendCapacityObservation>());
		if (Option.isSome(native)) {
			yield* observeCapacity(writes)(backend, native.value);
		}
		const row = yield* db.BackendCapacity.where({ backend }).first();
		return Option.isSome(row) ? yield* storedCapacityReading(row.value) : defaultCapacityReading(backend);
	});
