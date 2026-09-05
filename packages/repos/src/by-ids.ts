import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const reposByIds = Effect.fn("Repos.byIds")(function* (ids: ReadonlyArray<string>) {
	const db = yield* Database;
	return yield* db.Repo.where((repo) => repo.id.in(ids))
		.orderBy((repo) => repo.createdAt.asc())
		.all();
});
