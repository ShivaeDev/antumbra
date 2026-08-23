import { Effect, Ref } from "effect";
import {
	closeSessionAttachment,
	type LiveSessionAttachment,
} from "#session-attachment.ts";

export interface Entry {
	readonly agentId: string;
	readonly attachment: LiveSessionAttachment;
	// why: when this Session's quiet began, in millis — the moment it stopped
	// having anything to do, not the last time it said so. Absent means it is
	// working. It lives here because it is only ever true while this
	// acquisition does — a restart takes both away together.
	readonly idleSince: number | undefined;
	// why: how many times words have reached this Session. A count rather than a
	// moment, because the only question ever asked of it is whether anything has
	// been said since a reading was taken — which is how an ending that arrives
	// after the next turn has already begun is told from one that ends the last.
	readonly stirrings: number;
}

export interface SessionAttachmentEntries {
	readonly attached: Effect.Effect<ReadonlySet<string>>;
	readonly holds: (sessionId: string) => Effect.Effect<boolean>;
	readonly idleSince: Effect.Effect<ReadonlyMap<string, number>>;
	readonly insert: (sessionId: string, entry: Entry) => Effect.Effect<void>;
	// why: quiet already under way is not disturbed by being declared again.
	// An Agent that repeats itself keeps the moment it first fell quiet, or the
	// hour would start over on every repetition and never come around.
	readonly rest: (sessionId: string, since: number) => Effect.Effect<void>;
	// why: the same rest, refused when the count taken before the caller made up
	// its mind is no longer the count now. Reading and marking are one step here
	// because that is the only way words landing between them cannot be lost.
	readonly restUnstirred: (
		sessionId: string,
		since: number,
		stirrings: number,
	) => Effect.Effect<boolean>;
	readonly rouse: (sessionId: string) => Effect.Effect<void>;
	readonly snapshot: Effect.Effect<ReadonlyMap<string, Entry>>;
	readonly stirrings: (sessionId: string) => Effect.Effect<number>;
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
	const revise = (sessionId: string, next: (entry: Entry) => Entry) =>
		Ref.update(entries, (current) => {
			const existing = current.get(sessionId);
			return existing === undefined
				? current
				: new Map(current).set(sessionId, next(existing));
		});
	const restUnstirred: SessionAttachmentEntries["restUnstirred"] = (
		sessionId,
		since,
		stirrings,
	) =>
		Ref.modify(entries, (current) => {
			const existing = current.get(sessionId);
			if (existing === undefined || existing.stirrings !== stirrings) {
				return [false, current];
			}
			const rested = { ...existing, idleSince: existing.idleSince ?? since };
			return [true, new Map(current).set(sessionId, rested)];
		});
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
		rest: (sessionId, since) =>
			revise(sessionId, (entry) => ({
				...entry,
				idleSince: entry.idleSince ?? since,
			})),
		restUnstirred,
		rouse: (sessionId) =>
			revise(sessionId, (entry) => ({
				...entry,
				idleSince: undefined,
				stirrings: entry.stirrings + 1,
			})),
		snapshot: Ref.get(entries),
		stirrings: (sessionId) =>
			Effect.map(
				Ref.get(entries),
				(current) => current.get(sessionId)?.stirrings ?? 0,
			),
		take,
	} satisfies SessionAttachmentEntries;
});
