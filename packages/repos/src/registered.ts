import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const registeredRepos = Effect.fn("Repos.registered")(function* () {
	const db = yield* Database;
	return yield* db.Repo.orderBy((repo) => repo.createdAt.asc()).all();
});
