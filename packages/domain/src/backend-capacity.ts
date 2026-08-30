import { DomainFeeds } from "@antumbra/domain-feeds";
import type { IntentExecution } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type {
	AgentBackend,
	BackendCapacityObservation,
} from "@antumbra/plugin-api";
import { waitFor } from "@antumbra/sessions";
import { Clock, Effect, Option, Stream } from "effect";
import { capacityHoldDetail } from "#backend-capacity-hold.ts";
import {
	type BackendCapacityReading,
	defaultCapacityReading,
	type StoredBackendCapacityInvalid,
} from "#backend-capacity-model.ts";
import { recoverBackendCapacities } from "#backend-capacity-recovery.ts";
import { makeBackendCapacityStore } from "#backend-capacity-store.ts";

export type {
	BackendCapacityReading,
	BackendCapacityStatus,
} from "#backend-capacity-model.ts";
export { StoredBackendCapacityInvalid } from "#backend-capacity-model.ts";

const reportPersistenceFailure = (backend: string, cause: unknown) =>
	Effect.logError("backend capacity could not be persisted", {
		backend,
		cause: String(cause),
	});

export interface BackendCapacities {
	readonly admit: (
		backend: string,
	) => Effect.Effect<void, unknown, IntentExecution>;
	readonly announce: Effect.Effect<void>;
	readonly clear: (backend: string) => Effect.Effect<void, PrismaError>;
	readonly current: (
		backend: string,
	) => Effect.Effect<
		BackendCapacityReading,
		PrismaError | StoredBackendCapacityInvalid
	>;
	readonly snapshot: Effect.Effect<
		ReadonlyArray<BackendCapacityReading>,
		PrismaError | StoredBackendCapacityInvalid
	>;
}

export const makeBackendCapacities = (
	backends: ReadonlyMap<string, AgentBackend>,
) =>
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const store = yield* makeBackendCapacityStore;
		const announce = feeds.publishFleetRefresh();
		const recovered = yield* recoverBackendCapacities(
			backends,
			yield* store.storedBackends,
		);
		yield* Effect.forEach(
			recovered,
			({ backend, observation }) => store.seedHistory(backend, observation),
			{ concurrency: 1, discard: true },
		);

		const persist = (
			backend: string,
			observation: BackendCapacityObservation,
		) => store.observe(backend, observation).pipe(Effect.andThen(announce));
		for (const [backend, registered] of backends) {
			const source = registered.capacity;
			if (source === undefined) {
				continue;
			}
			// why: after the fork yields, a frame is either already in `current` or
			// reaches the live subscriber. A persistence failure is reported without
			// killing that subscriber; the source still retains the latest reading.
			yield* Effect.forkScoped(
				Stream.runForEach(source.changes, (observation) =>
					persist(backend, observation).pipe(
						Effect.catchCause((cause) =>
							reportPersistenceFailure(backend, cause),
						),
					),
				),
			);
			yield* Effect.yieldNow;
			const current = yield* source.current;
			if (Option.isSome(current)) {
				yield* persist(backend, current.value);
			}
		}

		const current = (backend: string) =>
			Effect.gen(function* () {
				const native = yield* backends.get(backend)?.capacity?.current ??
					Effect.succeed(Option.none<BackendCapacityObservation>());
				if (Option.isSome(native)) {
					yield* store.observe(backend, native.value);
				}
				return Option.getOrElse(yield* store.read(backend), () =>
					defaultCapacityReading(backend),
				);
			});
		const snapshot = Effect.forEach([...backends.keys()], current, {
			concurrency: 1,
		});
		const admit = (backend: string) =>
			Effect.flatMap(current(backend), (capacity) =>
				capacity.status !== "blocked"
					? Effect.void
					: waitFor(capacityHoldDetail(backend, capacity.detail)),
			);
		const clear = (backend: string) =>
			Effect.gen(function* () {
				const source = backends.get(backend)?.capacity;
				const observedAt =
					source === undefined
						? yield* Clock.currentTimeMillis
						: yield* source.clear;
				return yield* store.clear(backend, observedAt);
			});
		return {
			admit,
			announce,
			clear,
			current,
			snapshot,
		} satisfies BackendCapacities;
	});
