import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { repoForgotten } from "#facts/repo-forgotten.ts";
import { repo } from "#rows/repo.ts";

export const repoForgottenMaterializer = materializer(repoForgotten, {
	writes: [repo],
	run: Effect.fn("repos.RepoForgotten")(function* (fact, rows) {
		yield* rows.repo.delete(fact.id);
	}),
});
