import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { repoRegistered } from "#facts/repo-registered.ts";
import { repo } from "#rows/repo.ts";

export const repoRegisteredMaterializer = materializer(repoRegistered, {
	writes: [repo],
	run: Effect.fn("repos.RepoRegistered")(function* (fact, rows) {
		if (yield* rows.repo.exists(fact.id)) {
			yield* rows.repo.update(fact.id, { defaultRef: fact.defaultRef });
		} else {
			yield* rows.repo.insert(fact);
		}
	}),
});
