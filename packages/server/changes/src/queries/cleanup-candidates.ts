import { candidates as query } from "@antumbra/domain-reclamation/queries/candidates.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { Effect } from "effect";
export const cleanupCandidates = Effect.fn("Changes.cleanupCandidates")(function* () {
	return yield* query.run({}, yield* (yield* ChangesHistory).rows(), {});
});
