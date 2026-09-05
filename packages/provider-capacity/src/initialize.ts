import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { BackendCapacityObservation } from "@antumbra/plugin-api";
import { Effect, Option, Semaphore, Sink, Stream } from "effect";
import { recoverBackendCapacities } from "#history.ts";
import { CapacitySources } from "#sources.ts";
import { observeCapacity, seedCapacityHistory } from "#writes.ts";

export const initializeCapacity = Effect.fn("BackendCapacities.initialize")(function* () {
	const sources = yield* CapacitySources;
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const writes = yield* Semaphore.make(1);
	const recovered = yield* recoverBackendCapacities(new Set((yield* db.BackendCapacity.all()).map((row) => row.backend)));
	yield* Effect.forEach(recovered, ({ backend, observation }) => seedCapacityHistory(writes)(backend, observation), {
		concurrency: 1,
		discard: true,
	});
	const persist = (backend: string, observation: BackendCapacityObservation) =>
		observeCapacity(writes)(backend, observation).pipe(Effect.provideService(Database, db), Effect.andThen(feeds.publishFleetRefresh()));
	for (const [backend, registered] of sources) {
		const source = registered.capacity;
		if (source === undefined) {
			continue;
		}
		const [initial, changes] = yield* Stream.peel(source.states, Sink.head());
		if (Option.isSome(initial) && Option.isSome(initial.value)) {
			yield* persist(backend, initial.value.value);
		}
		yield* Effect.forkScoped(
			Stream.runForEach(changes, (state) =>
				Option.isSome(state)
					? persist(backend, state.value).pipe(
							Effect.catchCause((cause) => Effect.logError("backend capacity could not be persisted", { backend, cause: String(cause) })),
						)
					: Effect.void,
			),
		);
	}
	return writes;
})();
