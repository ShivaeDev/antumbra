export interface SessionTurnMark {
	readonly acquisition: number;
	readonly stirrings: number;
}

export type SessionTurnEnding = "overtaken" | "rested" | "stranded";

interface Held {
	readonly acquisition: number;
	readonly stirrings: number;
}

export const turnMarkOf = (entry: Held | undefined): SessionTurnMark | undefined =>
	entry === undefined ? undefined : { acquisition: entry.acquisition, stirrings: entry.stirrings };

export const turnEndingOf = (entry: Held | undefined, mark: SessionTurnMark | undefined): SessionTurnEnding => {
	if (entry === undefined) {
		return "stranded";
	}
	return mark !== undefined && (entry.acquisition !== mark.acquisition || entry.stirrings !== mark.stirrings) ? "overtaken" : "rested";
};
