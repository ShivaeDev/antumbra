import type { repoForgotten } from "@antumbra/domain-repos/facts/repo-forgotten.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const repoForgottenMaterializer = Effect.fn("repos.RepoForgotten")(function* (
	fact: FactValue<typeof repoForgotten>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.repo.delete(fact.id).pipe(Effect.orDie);
});
