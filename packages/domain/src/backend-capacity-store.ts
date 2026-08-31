import { Database, type PrismaError } from "@antumbra/persistence";
import type { BackendCapacityObservation } from "@antumbra/plugin-api";
import { Clock, Effect, Option, Semaphore } from "effect";
import { type BackendCapacityReading, type StoredBackendCapacityInvalid, storedCapacityReading } from "#backend-capacity-model.ts";
import { availableCapacityValues, capacityObservationValues, ignoreCapacityObservation } from "#backend-capacity-write.ts";

export interface BackendCapacityStore {
	readonly clear: (backend: string, observedAt: number) => Effect.Effect<void, PrismaError>;
	readonly observe: (backend: string, observation: BackendCapacityObservation) => Effect.Effect<void, PrismaError>;
	readonly read: (backend: string) => Effect.Effect<Option.Option<BackendCapacityReading>, PrismaError | StoredBackendCapacityInvalid>;
	readonly storedBackends: Effect.Effect<ReadonlySet<string>, PrismaError>;
	readonly seedHistory: (backend: string, observation: Option.Option<BackendCapacityObservation>) => Effect.Effect<void, PrismaError>;
}

export const makeBackendCapacityStore = Effect.gen(function* () {
	const db = yield* Database;
	const writes = yield* Semaphore.make(1);
	const observe = (backend: string, observation: BackendCapacityObservation) =>
		writes.withPermit(
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
	const clear = (backend: string, observedAt: number) =>
		writes.withPermit(
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
	const seedHistory = (backend: string, observation: Option.Option<BackendCapacityObservation>) =>
		writes.withPermit(
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
	return {
		clear,
		observe,
		read: (backend: string) =>
			Effect.flatMap(db.BackendCapacity.where({ backend }).first(), (row) =>
				Option.isSome(row) ? Effect.map(storedCapacityReading(row.value), Option.some) : Effect.succeed(Option.none()),
			),
		storedBackends: Effect.map(db.BackendCapacity.all(), (rows) => new Set(rows.map((row) => row.backend))),
		seedHistory,
	} satisfies BackendCapacityStore;
});
