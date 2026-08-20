import { Schema } from "effect";

// why: work a session delegated is still the session's work, but the log must
// not claim the session's own turn produced it. Origin rides every event a
// subsession produced — the frames it spoke and the gaps observed while it
// spoke them — and is absent on the root session's own turns, so every row
// written before it existed stays valid. Depth is never asserted here: it is a
// property of the tree, walked from the opened events when read.
//
// node names the subsession that produced the event and is optional because a
// provider that spawns one subsession per tool call leaves it recoverable from
// spawnedBy alone. One that fans a single call out to many — a workflow run —
// does not, and a reader joining on the call there would attribute every
// sibling's words to whichever of them opened last.
export const Origin = Schema.Struct({
	node: Schema.optional(Schema.String),
	parentNode: Schema.optional(Schema.String),
	spawnedBy: Schema.String,
});
export type Origin = typeof Origin.Type;
