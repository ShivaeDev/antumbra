import type {
	AgentBackend,
	BackendFailure,
	OpenSessionOptions,
	SessionHandle,
	WireEvent,
} from "@antumbra/plugin-api";
import { Effect, Exit, Ref, Scope, Stream } from "effect";

export type EventSink = (event: WireEvent) => Effect.Effect<void>;

interface FabricEntry {
	readonly handle: SessionHandle;
	readonly scope: Scope.Closeable;
}

export interface SessionFabric {
	readonly start: (
		backend: AgentBackend,
		options: OpenSessionOptions,
		sink: EventSink,
	) => Effect.Effect<SessionHandle, BackendFailure>;
	readonly stop: (sessionId: string) => Effect.Effect<void>;
}

// why: the fabric is the ruled ephemeral registry — live handles only, never
// persisted, rebuilt empty at boot. Closing an entry's scope is the single
// teardown path, so a stopped session can never leak its subprocess or pump.
export const makeSessionFabric = Effect.gen(function* () {
	const entries = yield* Ref.make<ReadonlyMap<string, FabricEntry>>(new Map());
	// why: kill discipline — when the owning layer tears down, every session
	// scope closes, so app quit never strands an SDK subprocess (P2 gotcha 10).
	yield* Effect.addFinalizer(() =>
		Effect.gen(function* () {
			const remaining = yield* Ref.getAndSet(entries, new Map());
			yield* Effect.forEach(remaining.values(), (entry) =>
				Scope.close(entry.scope, Exit.void),
			);
		}),
	);
	const start: SessionFabric["start"] = (backend, options, sink) =>
		Effect.gen(function* () {
			const existing = (yield* Ref.get(entries)).get(options.sessionId);
			if (existing !== undefined) {
				return existing.handle;
			}
			const scope = yield* Scope.make();
			const handle = yield* backend
				.openSession(options)
				.pipe(Scope.provide(scope));
			// why: a dead pump must be visible, never fatal — the session lives on
			// and the gap in the event log is the trace.
			yield* handle.events.pipe(
				Stream.runForEach(sink),
				Effect.catchCause((cause) =>
					Effect.logError(
						"event pump failed",
						{ sessionId: options.sessionId },
						cause,
					),
				),
				Effect.forkIn(scope),
			);
			yield* Ref.update(entries, (map) =>
				new Map(map).set(options.sessionId, { handle, scope }),
			);
			return handle;
		});
	const stop: SessionFabric["stop"] = (sessionId) =>
		Effect.gen(function* () {
			const entry = (yield* Ref.get(entries)).get(sessionId);
			if (entry === undefined) {
				return;
			}
			yield* Ref.update(entries, (map) => {
				const next = new Map(map);
				next.delete(sessionId);
				return next;
			});
			yield* Scope.close(entry.scope, Exit.void);
		});
	return { start, stop } satisfies SessionFabric;
});
