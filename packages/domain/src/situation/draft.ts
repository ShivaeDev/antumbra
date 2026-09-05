import { Changes } from "@antumbra/changes";
import type { SituationDraft } from "@antumbra/contract";
import { Repos } from "@antumbra/repos";
import { Effect, Option } from "effect";
import { ChangeNotAddressable } from "#errors.ts";
import { situationWords } from "#situation/words.ts";

export const makeSituationDraft = Effect.fnUntraced(function* () {
	const changes = yield* Changes;
	const repos = yield* Repos;
	return Effect.fn("Situation.draft")(function* (draft: SituationDraft) {
		const found = yield* changes.byId(draft.changeId);
		if (Option.isNone(found) || found.value.externalId === null) {
			return yield* new ChangeNotAddressable({ changeId: draft.changeId });
		}
		const change = found.value;
		const [repo] = yield* repos.byIds([change.repoId]);
		return situationWords(draft.situation, change, repo?.name ?? change.repoId);
	});
});
