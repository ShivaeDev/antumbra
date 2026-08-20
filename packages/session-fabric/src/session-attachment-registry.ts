import type {
	AgentBackend,
	BackendFailure,
	OpenSessionOptions,
} from "@antumbra/plugin-api";
import { Effect, Exit, Ref, Semaphore } from "effect";
import type { SessionAttachmentFailure } from "#errors.ts";
import { SessionNotLive } from "#errors.ts";
import {
	closeSessionAttachment,
	type EventSink,
	type LiveSessionAttachment,
	openSessionAttachment,
	type SessionAttachment,
} from "#session-attachment.ts";
import { occupancyRefusal } from "#session-attachment-occupancy.ts";

interface Entry {
	readonly agentId: string;
	readonly attachment: LiveSessionAttachment;
}

export interface SessionAttachmentRegistry {
	readonly attach: <E, R>(
		agentId: string,
		backend: AgentBackend,
		options: OpenSessionOptions,
		sink: EventSink,
		admit: (attachment: SessionAttachment) => Effect.Effect<void, E, R>,
	) => Effect.Effect<void, BackendFailure | SessionAttachmentFailure | E, R>;
	readonly holds: (sessionId: string) => Effect.Effect<boolean>;
	readonly interrupt: (
		sessionId: string,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	readonly send: (
		sessionId: string,
		text: string,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	readonly stop: (sessionId: string) => Effect.Effect<void>;
}

export const makeSessionAttachmentRegistry = Effect.gen(function* () {
	const entries = yield* Ref.make<ReadonlyMap<string, Entry>>(new Map());
	const agentGates = yield* Ref.make<ReadonlyMap<string, Semaphore.Semaphore>>(
		new Map(),
	);
	const gateFor = (agentId: string) =>
		Effect.gen(function* () {
			const candidate = yield* Semaphore.make(1);
			return yield* Ref.modify(agentGates, (current) => {
				const existing = current.get(agentId);
				return existing === undefined
					? [candidate, new Map(current).set(agentId, candidate)]
					: [existing, current];
			});
		});
	const remove = (sessionId: string) =>
		Effect.gen(function* () {
			const entry = yield* Ref.modify(entries, (current) => {
				const existing = current.get(sessionId);
				if (existing === undefined) {
					return [undefined, current];
				}
				const next = new Map(current);
				next.delete(sessionId);
				return [existing, next];
			});
			if (entry !== undefined) {
				yield* closeSessionAttachment(entry.attachment);
			}
		});
	const removeOwned = (agentId: string, sessionId: string) =>
		Effect.gen(function* () {
			const entry = (yield* Ref.get(entries)).get(sessionId);
			if (entry?.agentId === agentId) {
				yield* remove(sessionId);
			}
		});
	yield* Effect.addFinalizer(() =>
		Effect.gen(function* () {
			const remaining = yield* Ref.getAndSet(entries, new Map());
			yield* Effect.forEach(remaining.values(), (entry) =>
				closeSessionAttachment(entry.attachment),
			);
		}),
	);
	const attach: SessionAttachmentRegistry["attach"] = (
		agentId,
		backend,
		options,
		sink,
		admit,
	) =>
		Effect.gen(function* () {
			const gate = yield* gateFor(agentId);
			yield* gate.withPermits(1)(
				Effect.gen(function* () {
					const current = yield* Ref.get(entries);
					const refused = occupancyRefusal(current, agentId, options.sessionId);
					if (refused !== undefined) {
						return yield* refused;
					}
					let entry = current.get(options.sessionId);
					if (entry === undefined) {
						const attachment = yield* openSessionAttachment(
							backend,
							options,
							sink,
						);
						const opened: Entry = { agentId, attachment };
						yield* Ref.update(entries, (map) =>
							new Map(map).set(options.sessionId, opened),
						);
						entry = opened;
					}
					yield* admit(entry.attachment);
				}).pipe(
					Effect.onExit((exit) =>
						Exit.isFailure(exit)
							? removeOwned(agentId, options.sessionId)
							: Effect.void,
					),
				),
			);
		});
	const liveHandle = (sessionId: string) =>
		Effect.gen(function* () {
			const entry = (yield* Ref.get(entries)).get(sessionId);
			return entry === undefined
				? yield* new SessionNotLive({ sessionId })
				: entry.attachment.handle;
		});
	return {
		attach,
		holds: (sessionId) =>
			Effect.map(Ref.get(entries), (current) => current.has(sessionId)),
		interrupt: (sessionId) =>
			liveHandle(sessionId).pipe(Effect.flatMap((handle) => handle.interrupt)),
		send: (sessionId, text) =>
			liveHandle(sessionId).pipe(
				Effect.flatMap((handle) => handle.queue(text)),
			),
		stop: remove,
	} satisfies SessionAttachmentRegistry;
});
