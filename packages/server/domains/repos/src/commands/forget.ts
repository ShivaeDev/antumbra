import { command } from "@antumbra/platform-feature/command.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Schema } from "effect";
import { repoForgotten } from "#facts/repo-forgotten.ts";
import { repoReference } from "#rows/repo-reference.ts";

export const forget = command("forget", {
	input: { id: RepoId },
	reads: [repoReference],
	emits: repoForgotten,
	rejections: { Referenced: { id: RepoId, message: Schema.String } },
});
