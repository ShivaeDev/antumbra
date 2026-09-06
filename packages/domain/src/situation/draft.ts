import { Changes } from "@antumbra/changes";
import type { SituationDraft } from "@antumbra/contract";
import { Repos } from "@antumbra/repos";
import { Effect } from "effect";
import { situationWords } from "#situation/words.ts";

export const makeSituationDraft = Effect.fnUntraced(function* () {
	const changes = yield* Changes;
	const repos = yield* Repos;
	return Effect.fn("Situation.draft")(function* (draft: SituationDraft) {
		const change = yield* changes.addressable(draft.changeId);
		const [repo] = yield* repos.byIds([change.repoId]);
		return situationWords(draft.situation, change, repo?.name ?? change.repoId);
	});
});
