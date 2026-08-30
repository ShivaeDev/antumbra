import { Effect, Ref } from "effect";
import { closeSessionAttachment } from "#session-attachment.ts";
import { type Entry, rested, roused } from "#session-attachment-entry.ts";
import { type SessionTurnEnding, type SessionTurnMark, turnEndingOf, turnMarkOf } from "#session-turn.ts";

export interface SessionAttachmentEntries {
	readonly attached: Effect.Effect<ReadonlySet<string>>;
	readonly endTurn: (sessionId: string, since: number, mark: SessionTurnMark | undefined) => Effect.Effect<SessionTurnEnding>;
	readonly holds: (sessionId: string) => Effect.Effect<boolean>;
	readonly idleSince: Effect.Effect<ReadonlyMap<string, number>>;
	readonly insert: (sessionId: string, entry: Omit<Entry, "acquisition">) => Effect.Effect<void>;
	readonly rest: (sessionId: string, since: number) => Effect.Effect<void>;
	readonly rouse: (sessionId: string) => Effect.Effect<void>;
	readonly snapshot: Effect.Effect<ReadonlyMap<string, Entry>>;
	readonly take: (sessionId: string, when: (entry: Entry) => boolean) => Effect.Effect<boolean>;
	readonly turnMark: (sessionId: string) => Effect.Effect<SessionTurnMark | undefined>;
}

export const makeSessionAttachmentEntries = Effect.gen(function* () {
	const entries = yield* Ref.make<ReadonlyMap<string, Entry>>(new Map());
	const acquisitions = yield* Ref.make(0);
	const revise = (sessionId: string, next: (entry: Entry) => Entry) =>
		Ref.update(entries, (current) => {
			const existing = current.get(sessionId);
			return existing === undefined ? current : new Map(current).set(sessionId, next(existing));
		});
	const endTurn: SessionAttachmentEntries["endTurn"] = (sessionId, since, mark) =>
		Ref.modify(entries, (current) => {
			const existing = current.get(sessionId);
			const ending = turnEndingOf(existing, mark);
			return existing === undefined || ending === "overtaken"
				? [ending, current]
				: [ending, new Map(current).set(sessionId, rested(existing, since))];
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
			yield* Effect.forEach(remaining.values(), (entry) => closeSessionAttachment(entry.attachment));
		}),
	);
	return {
		attached: Effect.map(Ref.get(entries), (current) => new Set(current.keys())),
		endTurn,
		holds: (sessionId) => Effect.map(Ref.get(entries), (current) => current.has(sessionId)),
		idleSince: Effect.map(
			Ref.get(entries),
			(current) => new Map([...current].flatMap(([sessionId, entry]) => (entry.idleSince === undefined ? [] : [[sessionId, entry.idleSince]]))),
		),
		insert: (sessionId, entry) =>
			Effect.flatMap(
				Ref.updateAndGet(acquisitions, (count) => count + 1),
				(acquisition) => Ref.update(entries, (current) => new Map(current).set(sessionId, { ...entry, acquisition })),
			),
		rest: (sessionId, since) => revise(sessionId, (entry) => rested(entry, since)),
		rouse: (sessionId) => revise(sessionId, roused),
		snapshot: Ref.get(entries),
		take,
		turnMark: (sessionId) => Effect.map(Ref.get(entries), (current) => turnMarkOf(current.get(sessionId))),
	} satisfies SessionAttachmentEntries;
});
