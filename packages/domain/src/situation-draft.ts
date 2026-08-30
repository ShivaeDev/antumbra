import { type ChangeRow, Changes } from "@antumbra/changes";
import type { ChangeSituation, SituationDraft } from "@antumbra/contract";
import type { PrismaError } from "@antumbra/persistence";
import { type AgentPrompt, checksFailed, mergeConflicts, unresolvedReviews } from "@antumbra/prompts";
import { Effect } from "effect";
import { repoNameOf } from "#change-view.ts";
import { ChangeNotAddressable } from "#errors.ts";
import { type VoyageWorldReadFailure, VoyageWorldSource } from "#voyage-world.ts";

export type SituationDraftRefused = ChangeNotAddressable | PrismaError | VoyageWorldReadFailure;

// why: the draft names the pull request, the branch it is on and the repo it
// lives in — the three facts Antumbra observed and holds itself. Which check
// went red and what a reviewer wrote stay on the host, where they are current
// and where the Agent that reads this is already berthed to look.
export const situationWords = (situation: ChangeSituation, change: ChangeRow, repo: string): AgentPrompt => {
	const facts = {
		headRef: change.headRef,
		reference: `#${change.externalId}`,
		repo,
	};
	switch (situation) {
		case "merge_conflicts":
			return mergeConflicts({ ...facts, baseRef: change.baseRef });
		case "checks_failed":
			return checksFailed(facts);
		case "unresolved_reviews":
			return unresolvedReviews(facts);
	}
};

// why: drafting says nothing to anybody. It reads the Change and returns the
// words, and the send that may follow is the admiral's separate act on whatever
// they left in the box.
export const makeSituationDraft = Effect.gen(function* () {
	const changes = yield* Changes;
	const source = yield* VoyageWorldSource;
	return (draft: SituationDraft): Effect.Effect<AgentPrompt, SituationDraftRefused> =>
		Effect.gen(function* () {
			const snapshot = yield* changes.snapshot;
			const change = snapshot.changes.find((row) => row.id === draft.changeId);
			if (change === undefined || change.externalId === null) {
				return yield* new ChangeNotAddressable({ changeId: draft.changeId });
			}
			return situationWords(draft.situation, change, repoNameOf(yield* source.read, change.repoId));
		});
});
