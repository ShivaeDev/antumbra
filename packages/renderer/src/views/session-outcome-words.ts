import type { SubsessionEnded } from "@antumbra/vocabulary/session-events";

type Outcome = (typeof SubsessionEnded.Type)["outcome"];

// why: what the record writes down is not what a reader is handed. The four
// stored endings are said in plain English here and nowhere else, the way
// transcript/gaps.ts is the one home for a gap kind's words — so the tree and
// the transcript mark cannot word the same ending two ways, and the durable
// vocabulary can be renamed without renaming what anyone reads.
export const outcomeWords: Record<Outcome, string> = {
	completed: "Finished",
	failed: "Ended in error",
	interrupted: "Stopped early",
	unknown: "Ending not seen",
};
