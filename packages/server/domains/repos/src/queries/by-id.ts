import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { RepoId } from "#ids.ts";
import { repo } from "#rows/repo.ts";

export const byId = query("byId", {
	input: { id: RepoId },
	output: Schema.NullOr(repo.Row),
	reads: [repo],
	run: Effect.fn("repos.byId")(function* (input, rows) {
		return Option.getOrNull(yield* rows.repo.find(input.id));
	}),
});
