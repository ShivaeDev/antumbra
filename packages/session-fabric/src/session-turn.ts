// why: what an ending has to be judged against. A bare count reads the same on
// an attachment that has heard nothing and on one that is no longer there, and
// those are opposite facts — so the acquisition the count belongs to travels
// with it.
export interface SessionTurnMark {
	readonly acquisition: number;
	readonly stirrings: number;
}

// why: three answers rather than a boolean. "Nothing is holding this Session"
// used to read as a mismatch and discard the ending, so a row whose process
// died mid-turn said active for ever. It is now its own verdict and settles.
export type SessionTurnEnding = "overtaken" | "rested" | "stranded";

// why: everything the verdict needs of an acquisition, so the rule can be read
// without the registry that stores it.
interface Held {
	readonly acquisition: number;
	readonly stirrings: number;
}

export const turnMarkOf = (
	entry: Held | undefined,
): SessionTurnMark | undefined =>
	entry === undefined
		? undefined
		: { acquisition: entry.acquisition, stirrings: entry.stirrings };

// why: an ending is refused only when something has taken the Session since the
// pump last looked — words that began another turn, or another attachment
// altogether. An ending the pump took no reading for cannot have been overtaken
// by anything, because it is the first thing this acquisition said.
export const turnEndingOf = (
	entry: Held | undefined,
	mark: SessionTurnMark | undefined,
): SessionTurnEnding => {
	if (entry === undefined) {
		return "stranded";
	}
	return mark !== undefined &&
		(entry.acquisition !== mark.acquisition ||
			entry.stirrings !== mark.stirrings)
		? "overtaken"
		: "rested";
};
