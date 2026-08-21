import type {
	AgentBackend,
	BackendFailure,
	OpenSessionOptions,
} from "@antumbra/plugin-api";
import { Clock, Effect, Exit, Ref, Semaphore } from "effect";
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
	// why: when the Agent said it had nothing left to do, in millis. Absent
	// means it is working. It lives here because it is only ever true while
	// this acquisition does — a restart takes both away together.
	readonly idleSince: number | undefined;
}

export interface SessionAttachmentRegistry {
	readonly attach: <E, R>(
		agentId: string,
		backend: AgentBackend,
		options: OpenSessionOptions,
		sink: EventSink,
		admit: (attachment: SessionAttachment) => Effect.Effect<void, E, R>,
	) => Effect.Effect<void, BackendFailure | SessionAttachmentFailure | E, R>;
	readonly attached: Effect.Effect<ReadonlySet<string>>;
	readonly holds: (sessionId: string) => Effect.Effect<boolean>;
	readonly idleSince: Effect.Effect<ReadonlyMap<string, number>>;
	readonly interrupt: (
		sessionId: string,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	readonly send: (
		sessionId: string,
		text: string,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	readonly standDown: (sessionId: string) => Effect.Effect<void>;
	readonly stop: (sessionId: string) => Effect.Effect<void>;
	readonly stopIdle: (sessionId: string) => Effect.Effect<boolean>;
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
	// why: taking the entry out of the map is the claim. Everything that ends an
	// acquisition goes through here, so a detach and a send can never both
	// believe they hold the same attachment.
	const take = (sessionId: string, when: (entry: Entry) => boolean) =>
		Effect.gen(function* () {
			const entry = yield* Ref.modify(entries, (current) => {
				const existing = current.get(sessionId);
				if (existing === undefined || !when(existing)) {
					return [undefined, current];
				}
				const next = new Map(current);
				next.delete(sessionId);
				return [existing, next];
			});
			if (entry !== undefined) {
				yield* closeSessionAttachment(entry.attachment);
			}
			return entry !== undefined;
		});
	const remove = (sessionId: string) =>
		take(sessionId, () => true).pipe(Effect.asVoid);
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
						const opened: Entry = {
							agentId,
							attachment,
							idleSince: undefined,
						};
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
	const mark = (sessionId: string, idleSince: number | undefined) =>
		Ref.update(entries, (current) => {
			const existing = current.get(sessionId);
			return existing === undefined
				? current
				: new Map(current).set(sessionId, { ...existing, idleSince });
		});
	// why: words arriving are the end of having nothing to do, and clearing the
	// mark before the handle is read is what stops a reclaim that had already
	// chosen this Session from taking the attachment out from under them.
	const rousingHandle = (sessionId: string) =>
		mark(sessionId, undefined).pipe(Effect.andThen(liveHandle(sessionId)));
	return {
		attach,
		attached: Effect.map(Ref.get(entries), (current) => new Set(current.keys())),
		holds: (sessionId) =>
			Effect.map(Ref.get(entries), (current) => current.has(sessionId)),
		idleSince: Effect.map(
			Ref.get(entries),
			(current) =>
				new Map(
					[...current].flatMap(([sessionId, entry]) =>
						entry.idleSince === undefined ? [] : [[sessionId, entry.idleSince]],
					),
				),
		),
		interrupt: (sessionId) =>
			liveHandle(sessionId).pipe(Effect.flatMap((handle) => handle.interrupt)),
		send: (sessionId, text) =>
			rousingHandle(sessionId).pipe(
				Effect.flatMap((handle) => handle.queue(text)),
			),
		standDown: (sessionId) =>
			Effect.flatMap(Clock.currentTimeMillis, (now) => mark(sessionId, now)),
		stop: remove,
		stopIdle: (sessionId) =>
			take(sessionId, (entry) => entry.idleSince !== undefined),
	} satisfies SessionAttachmentRegistry;
});
