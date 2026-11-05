import { query } from "@antumbra/platform-feature/query.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Schema } from "effect";
import { repo } from "#rows/repo.ts";

export const byId = query("byId", {
	input: { id: RepoId },
	output: Schema.NullOr(repo.Row),
	reads: [repo],
});
