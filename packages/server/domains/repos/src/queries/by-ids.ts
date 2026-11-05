import { query } from "@antumbra/platform-feature/query.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Schema } from "effect";
import { repo } from "#rows/repo.ts";

export const byIds = query("byIds", {
	input: { ids: Schema.Array(RepoId) },
	output: Schema.Array(repo.Row),
	reads: [repo],
});
