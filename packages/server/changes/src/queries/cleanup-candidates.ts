import { candidates as queryDecision } from "@antumbra/server-reclamation/logic/queries/candidates.ts";
import { Effect } from "effect";
export const cleanupCandidates = Effect.fn("Changes.cleanupCandidates")(function* () {
	return yield* queryDecision({});
});
