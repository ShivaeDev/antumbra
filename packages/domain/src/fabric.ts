import type {
	AgentBackend,
	OpenSessionOptions,
	SessionHandle,
} from "@antumbra/plugin-api";
import { BackendFailure } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/session-events";
import { Effect, Exit, Ref, Scope, Semaphore, Stream } from "effect";
import { type SessionAttachmentFailure, SessionNotLive } from "#errors.ts";
import { makeOpeningConfirmation } from "#session-opening.ts";

export type EventSink = (event: AgentEvent) => Effect.Effect<boolean>;

export interface SessionAttachment {
	readonly handle: SessionHandle;
	readonly openedNativeRef: Effect.Effect<
		string,
		BackendFailure | SessionAttachmentFailure
	>;
}

interface FabricEntry extends SessionAttachment {
	readonly scope: Scope.Closeable;
}

export interface SessionFabric {
	readonly interrupt: (
		sessionId: string,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	readonly start: (
		backend: AgentBackend,
		options: OpenSessionOptions,
		sink: EventSink,
	) => Effect.Effect<SessionAttachment, BackendFailure>;
	readonly stop: (sessionId: string) => Effect.Effect<void>;
}

// why: live handles only, never persisted — rebuilt empty at boot. Closing an
// entry's scope is the single teardown path, so a stopped session can never
// leak its subprocess or pump.
export const makeSessionFabric = Effect.gen(function* () {
	const entries = yield* Ref.make<ReadonlyMap<string, FabricEntry>>(new Map());
	const startGates = yield* Ref.make<ReadonlyMap<string, Semaphore.Semaphore>>(
		new Map(),
	);
	const startGate = (sessionId: string) =>
		Semaphore.make(1).pipe(
			Effect.flatMap((candidate) =>
				Ref.modify(startGates, (gates) => {
					const existing = gates.get(sessionId);
					return existing === undefined
						? [candidate, new Map(gates).set(sessionId, candidate)]
						: [existing, gates];
				}),
			),
		);
	const openAttachment = (
		backend: AgentBackend,
		options: OpenSessionOptions,
		sink: EventSink,
	) =>
		Effect.gen(function* () {
			const scope = yield* Scope.make();
			const handle = yield* backend
				.openSession(options)
				.pipe(Scope.provide(scope));
			const opened = yield* makeOpeningConfirmation;
			const observe = (event: AgentEvent) =>
				sink(event).pipe(
					Effect.flatMap((persisted) => opened.observe(event, persisted)),
					Effect.asVoid,
				);
			const endedBeforeOpening = new BackendFailure({
				detail: "session ended before confirming its native identity",
				tag: backend.tag,
			});
			// why: a dead pump must be visible, never fatal — the session lives on
			// and the gap in the event log is the trace.
			yield* handle.events.pipe(
				Stream.runForEach(observe),
				Effect.tapError(opened.fail),
				Effect.ensuring(opened.fail(endedBeforeOpening)),
				Effect.catchCause((cause) =>
					Effect.logError(
						"event pump failed",
						{ sessionId: options.sessionId },
						cause,
					),
				),
				Effect.forkIn(scope),
			);
			return {
				handle,
				openedNativeRef: opened.await,
				scope,
			} satisfies FabricEntry;
		});
	// why: when the owning layer tears down, every session scope closes — app
	// quit must never strand an SDK subprocess.
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
			const gate = yield* startGate(options.sessionId);
			return yield* gate.withPermits(1)(
				Effect.gen(function* () {
					const existing = (yield* Ref.get(entries)).get(options.sessionId);
					if (existing !== undefined) {
						return existing;
					}
					const entry = yield* openAttachment(backend, options, sink);
					yield* Ref.update(entries, (map) =>
						new Map(map).set(options.sessionId, entry),
					);
					return entry;
				}),
			);
		});
	const interrupt: SessionFabric["interrupt"] = (sessionId) =>
		Effect.gen(function* () {
			const entry = (yield* Ref.get(entries)).get(sessionId);
			if (entry === undefined) {
				return yield* new SessionNotLive({ sessionId });
			}
			yield* entry.handle.interrupt;
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
	return { interrupt, start, stop } satisfies SessionFabric;
});
