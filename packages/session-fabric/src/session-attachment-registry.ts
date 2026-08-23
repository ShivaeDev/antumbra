import type {
	AgentBackend,
	BackendFailure,
	OpenSessionOptions,
	SessionInput,
} from "@antumbra/plugin-api";
import { Clock, Effect, Exit, Ref, Semaphore } from "effect";
import type { SessionAttachmentFailure } from "#errors.ts";
import { SessionNotLive } from "#errors.ts";
import {
	type EventSink,
	openSessionAttachment,
	type SessionAttachment,
} from "#session-attachment.ts";
import { makeSessionAttachmentEntries } from "#session-attachment-entries.ts";
import { occupancyRefusal } from "#session-attachment-occupancy.ts";

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
		input: SessionInput,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	readonly standDown: (sessionId: string) => Effect.Effect<void>;
	readonly stop: (sessionId: string) => Effect.Effect<void>;
	readonly stopIdle: (sessionId: string) => Effect.Effect<boolean>;
}

export const makeSessionAttachmentRegistry = Effect.gen(function* () {
	const entries = yield* makeSessionAttachmentEntries;
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
		entries.take(sessionId, () => true).pipe(Effect.asVoid);
	const removeOwned = (agentId: string, sessionId: string) =>
		entries
			.take(sessionId, (entry) => entry.agentId === agentId)
			.pipe(Effect.asVoid);
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
					const current = yield* entries.snapshot;
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
						entry = { agentId, attachment, idleSince: undefined };
						yield* entries.insert(options.sessionId, entry);
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
			const entry = (yield* entries.snapshot).get(sessionId);
			return entry === undefined
				? yield* new SessionNotLive({ sessionId })
				: entry.attachment.handle;
		});
	// why: words arriving are the end of having nothing to do, and clearing the
	// mark before the handle is read is what stops a reclaim that had already
	// chosen this Session from taking the attachment out from under them.
	const rousingHandle = (sessionId: string) =>
		entries.rouse(sessionId).pipe(Effect.andThen(liveHandle(sessionId)));
	return {
		attach,
		attached: entries.attached,
		holds: entries.holds,
		idleSince: entries.idleSince,
		interrupt: (sessionId) =>
			liveHandle(sessionId).pipe(Effect.flatMap((handle) => handle.interrupt)),
		send: (sessionId, input) =>
			rousingHandle(sessionId).pipe(
				Effect.flatMap((handle) => handle.queue(input)),
				Effect.annotateSpans({ sessionId }),
			),
		standDown: (sessionId) =>
			Effect.flatMap(Clock.currentTimeMillis, (now) =>
				entries.rest(sessionId, now),
			),
		stop: remove,
		stopIdle: (sessionId) =>
			entries.take(sessionId, (entry) => entry.idleSince !== undefined),
	} satisfies SessionAttachmentRegistry;
});
