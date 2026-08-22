import { Effect, Ref } from "effect";
import {
	closeSessionAttachment,
	type LiveSessionAttachment,
} from "#session-attachment.ts";

export interface Entry {
	readonly agentId: string;
	readonly attachment: LiveSessionAttachment;
	// why: when the Agent said it had nothing left to do, in millis. Absent
	// means it is working. It lives here because it is only ever true while
	// this acquisition does — a restart takes both away together.
	readonly idleSince: number | undefined;
}

export interface SessionAttachmentEntries {
	readonly attached: Effect.Effect<ReadonlySet<string>>;
	readonly holds: (sessionId: string) => Effect.Effect<boolean>;
	readonly idleSince: Effect.Effect<ReadonlyMap<string, number>>;
	readonly insert: (sessionId: string, entry: Entry) => Effect.Effect<void>;
	readonly mark: (
		sessionId: string,
		idleSince: number | undefined,
	) => Effect.Effect<void>;
	readonly snapshot: Effect.Effect<ReadonlyMap<string, Entry>>;
	// why: taking the entry out of the map is the claim. Everything that ends an
	// acquisition goes through here, so a detach and a send can never both
	// believe they hold the same attachment.
	readonly take: (
		sessionId: string,
		when: (entry: Entry) => boolean,
	) => Effect.Effect<boolean>;
}

// why: one map of live acquisitions, and every hand that reaches for one goes
// through the same Ref. Whoever removes an entry has the attachment to close,
// so closing is never done twice and never left undone.
export const makeSessionAttachmentEntries = Effect.gen(function* () {
	const entries = yield* Ref.make<ReadonlyMap<string, Entry>>(new Map());
	const take: SessionAttachmentEntries["take"] = (sessionId, when) =>
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
	yield* Effect.addFinalizer(() =>
		Effect.gen(function* () {
			const remaining = yield* Ref.getAndSet(entries, new Map());
			yield* Effect.forEach(remaining.values(), (entry) =>
				closeSessionAttachment(entry.attachment),
			);
		}),
	);
	return {
		attached: Effect.map(
			Ref.get(entries),
			(current) => new Set(current.keys()),
		),
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
		insert: (sessionId, entry) =>
			Ref.update(entries, (current) => new Map(current).set(sessionId, entry)),
		mark: (sessionId, idleSince) =>
			Ref.update(entries, (current) => {
				const existing = current.get(sessionId);
				return existing === undefined
					? current
					: new Map(current).set(sessionId, { ...existing, idleSince });
			}),
		snapshot: Ref.get(entries),
		take,
	} satisfies SessionAttachmentEntries;
});
