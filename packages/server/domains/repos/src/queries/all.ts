import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { repo } from "#rows/repo.ts";

export const all = query("all", {
	input: {},
	output: Schema.Array(repo.Row),
	reads: [repo],
	run: Effect.fn("repos.all")(function* (_input, rows) {
		return (yield* rows.repo.where({})).toSorted((left, right) => left.createdAt.localeCompare(right.createdAt));
	}),
});
