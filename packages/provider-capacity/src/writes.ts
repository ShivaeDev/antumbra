import { Database } from "@antumbra/persistence";
import type { BackendCapacityObservation } from "@antumbra/plugin-api";
import { Clock, Effect, Option, type Semaphore } from "effect";
import { availableCapacityValues, capacityObservationValues, ignoreCapacityObservation } from "#observation-values.ts";

export const observeCapacity = (writes: Semaphore.Semaphore) =>
	Effect.fn("BackendCapacities.observe")(function* (backend: string, observation: BackendCapacityObservation) {
		const db = yield* Database;
		return yield* writes.withPermit(
			Effect.gen(function* () {
				const current = yield* db.BackendCapacity.where({ backend }).first();
				if (ignoreCapacityObservation(current, observation)) {
					return;
				}
				const values = capacityObservationValues(observation, new Date(yield* Clock.currentTimeMillis));
				if (Option.isNone(current)) {
					yield* db.BackendCapacity.create({ backend, ...values });
					return;
				}
				yield* db.BackendCapacity.where({ backend }).update(values);
			}),
		);
	});
export const clearStoredCapacity = (writes: Semaphore.Semaphore) =>
	Effect.fn("BackendCapacities.clearStored")(function* (backend: string, observedAt: number) {
		const db = yield* Database;
		return yield* writes.withPermit(
			Effect.gen(function* () {
				const existing = yield* db.BackendCapacity.where({ backend }).first();
				const at = new Date(observedAt);
				if (Option.isNone(existing)) {
					yield* db.BackendCapacity.create({
						backend,
						...availableCapacityValues(at, at),
					});
					return;
				}
				// A provider observation received after the clear request takes precedence.
				if (existing.value.observedAt.getTime() > observedAt) {
					return;
				}
				yield* db.BackendCapacity.where({ backend }).update(availableCapacityValues(at, at));
			}),
		);
	});
export const seedCapacityHistory = (writes: Semaphore.Semaphore) =>
	Effect.fn("BackendCapacities.seedHistory")(function* (backend: string, observation: Option.Option<BackendCapacityObservation>) {
		const db = yield* Database;
		return yield* writes.withPermit(
			Effect.gen(function* () {
				const existing = yield* db.BackendCapacity.where({ backend }).first();
				if (Option.isSome(existing)) {
					return;
				}
				const updatedAt = new Date(yield* Clock.currentTimeMillis);
				yield* db.BackendCapacity.create({
					backend,
					...Option.match(observation, {
						onNone: () => availableCapacityValues(new Date(0), updatedAt),
						onSome: (reading) => capacityObservationValues(reading, updatedAt),
					}),
				});
			}),
		);
	});
