import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { repo } from "#rows/repo.ts";

export const all = query("all", {
	input: {},
	output: Schema.Array(repo.Row),
	reads: [repo],
});
