import { Schema } from "effect";
import { decoder } from "#pr/decode.ts";
import type { Note } from "#pr/notes.ts";
import { Pieces } from "#pr/observation.ts";
import { Page } from "#pr/pages.ts";
import { initial, noteKey, type Watch } from "#pr/program.ts";
import { Lifecycle, Merge } from "#pr/pull.ts";

const Remembered = Schema.Struct({
	backlog: Schema.Boolean,
	changesRequested: Schema.Boolean,
	head: Schema.optional(Schema.String),
	lifecycle: Lifecycle,
	merge: Schema.optional(Merge),
	pieces: Pieces,
	seen: Schema.Array(Schema.String),
	settled: Schema.optional(Schema.Struct({ ci: Schema.Literals(["failed", "green"]), head: Schema.String })),
});
type Remembered = typeof Remembered.Type;

export const Memory = Schema.Struct({
	etags: Schema.Record(Schema.String, Schema.Array(Page)),
	pulls: Schema.Record(Schema.String, Remembered),
});
export type Memory = typeof Memory.Type;

export const forgotten: Memory = { etags: {}, pulls: {} };

export const decodeMemory = decoder(Schema.fromJsonString(Memory));

export const encodeMemory = (memory: Memory): string => `${JSON.stringify(memory)}\n`;

export const remember = (watch: Watch): Remembered => {
	const unseen = (note: Note) => !watch.seen.has(noteKey(note));
	const { pieces } = watch;
	return {
		backlog: watch.backlog,
		changesRequested: watch.changesRequested,
		head: watch.head,
		lifecycle: watch.lifecycle,
		merge: watch.merge,
		pieces: {
			...pieces,
			comments: pieces.comments.filter(unseen),
			inline: pieces.inline.filter((entry) => unseen(entry.note)),
			reviews: pieces.reviews === undefined ? undefined : { ...pieces.reviews, notes: pieces.reviews.notes.filter(unseen) },
		},
		seen: [...watch.seen],
		settled: watch.settled,
	};
};

export const recall = (remembered: Remembered): Watch => ({
	...initial,
	backlog: remembered.backlog,
	changesRequested: remembered.changesRequested,
	head: remembered.head,
	lifecycle: remembered.lifecycle,
	merge: remembered.merge,
	pieces: remembered.pieces,
	seen: new Set(remembered.seen),
	settled: remembered.settled,
});
