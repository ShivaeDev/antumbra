import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { RepoId } from "#ids.ts";
import { repo } from "#rows/repo.ts";

export const byIds = query("byIds", {
	input: { ids: Schema.Array(RepoId) },
	output: Schema.Array(repo.Row),
	reads: [repo],
	run: Effect.fn("repos.byIds")(function* (input, rows) {
		const ids = new Set(input.ids);
		return (yield* rows.repo.where({}))
			.filter((stored) => ids.has(stored.id))
			.toSorted((left, right) => left.createdAt.localeCompare(right.createdAt));
	}),
});
