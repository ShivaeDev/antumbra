import type { LiveSessionAttachment } from "#session-attachment.ts";

export interface Entry {
	// why: which acquisition this is, counted from the start of the process. It
	// tells an ending left behind by an attachment that is gone from one a newer
	// attachment has since taken over.
	readonly acquisition: number;
	readonly agentId: string;
	readonly attachment: LiveSessionAttachment;
	// why: when this Session's quiet began, in millis — the moment it stopped
	// having anything to do, not the last time it said so. Absent means it is
	// working. It lives here because it is only ever true while this
	// acquisition does — a restart takes both away together.
	readonly idleSince: number | undefined;
	// why: how many times words have reached this Session. A count rather than a
	// moment, because the only question ever asked of it is whether anything has
	// been said since a reading was taken.
	readonly stirrings: number;
}

// why: quiet already under way is not disturbed by being declared again. An
// Agent that repeats itself keeps the moment it first fell quiet, or the hour
// would start over on every repetition and never come around.
export const rested = (entry: Entry, since: number): Entry => ({
	...entry,
	idleSince: entry.idleSince ?? since,
});

// why: words are the end of having nothing to do, and the count they raise is
// what a later ending is measured against.
export const roused = (entry: Entry): Entry => ({
	...entry,
	idleSince: undefined,
	stirrings: entry.stirrings + 1,
});
