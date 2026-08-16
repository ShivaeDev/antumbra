import type {
	AgentBackend,
	BackendFailure,
	OpenSessionOptions,
} from "@antumbra/plugin-api";
import { Context, Effect, Exit, Layer, Ref } from "effect";
import { type SessionAttachmentFailure, SessionNotLive } from "#errors.ts";
import {
	closeSessionAttachment,
	type EventSink,
	type LiveSessionAttachment,
	openSessionAttachment,
	type SessionAttachment,
} from "#session-attachment.ts";
import { makeSessionLifecycles } from "#session-lifecycle.ts";

export type { EventSink, SessionAttachment } from "#session-attachment.ts";

export interface SessionFabricService {
	readonly interrupt: (
		sessionId: string,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	readonly start: <E, R>(
		backend: AgentBackend,
		options: OpenSessionOptions,
		sink: EventSink,
		admit: (attachment: SessionAttachment) => Effect.Effect<void, E, R>,
	) => Effect.Effect<void, BackendFailure | SessionAttachmentFailure | E, R>;
	readonly stop: (sessionId: string) => Effect.Effect<void>;
}

export class SessionFabric extends Context.Service<
	SessionFabric,
	SessionFabricService
>()("@antumbra/domain/SessionFabric") {}

// why: live handles only, never persisted — rebuilt empty at boot. Closing an
// entry's scope is the single teardown path, so a stopped session can never
// leak its subprocess or pump.
export const makeSessionFabric = Effect.gen(function* () {
	const entries = yield* Ref.make<ReadonlyMap<string, LiveSessionAttachment>>(
		new Map(),
	);
	const lifecycles = yield* makeSessionLifecycles;
	const removeEntry = (sessionId: string) =>
		Effect.gen(function* () {
			const entry = yield* Ref.modify(entries, (map) => {
				const existing = map.get(sessionId);
				if (existing === undefined) {
					return [undefined, map];
				}
				const next = new Map(map);
				next.delete(sessionId);
				return [existing, next];
			});
			if (entry !== undefined) {
				yield* closeSessionAttachment(entry);
			}
		});
	// why: when the owning layer tears down, every session scope closes — app
	// quit must never strand an SDK subprocess.
	yield* Effect.addFinalizer(() =>
		Effect.gen(function* () {
			const remaining = yield* Ref.getAndSet(entries, new Map());
			yield* Effect.forEach(remaining.values(), (entry) =>
				closeSessionAttachment(entry),
			);
		}),
	);
	const start: SessionFabricService["start"] = (
		backend,
		options,
		sink,
		admit,
	) =>
		lifecycles.admit(
			options.sessionId,
			Effect.gen(function* () {
				let entry = (yield* Ref.get(entries)).get(options.sessionId);
				if (entry === undefined) {
					const opened = yield* openSessionAttachment(backend, options, sink);
					yield* Ref.update(entries, (map) =>
						new Map(map).set(options.sessionId, opened),
					);
					entry = opened;
				}
				yield* admit(entry);
			}).pipe(
				Effect.onExit((exit) =>
					Exit.isFailure(exit) ? removeEntry(options.sessionId) : Effect.void,
				),
			),
		);
	const interrupt: SessionFabricService["interrupt"] = (sessionId) =>
		Effect.gen(function* () {
			const entry = (yield* Ref.get(entries)).get(sessionId);
			if (entry === undefined) {
				return yield* new SessionNotLive({ sessionId });
			}
			yield* entry.handle.interrupt;
		});
	const stop: SessionFabricService["stop"] = (sessionId) =>
		lifecycles.stop(sessionId, removeEntry(sessionId));
	return { interrupt, start, stop } satisfies SessionFabricService;
});

export const SessionFabricLive = Layer.effect(SessionFabric)(makeSessionFabric);
