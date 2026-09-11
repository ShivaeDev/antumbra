import type { SubsessionEnded } from "@antumbra/platform-vocabulary/session-events/subsessions.ts";

type Outcome = (typeof SubsessionEnded.Type)["outcome"];

export const outcomeWords: Record<Outcome, string> = {
	completed: "Finished",
	failed: "Ended in error",
	interrupted: "Stopped early",
	unknown: "Ending not seen",
};
