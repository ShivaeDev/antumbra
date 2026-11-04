import { command } from "@antumbra/platform-feature/command.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Effect, Schema } from "effect";
import { repoForgotten } from "#facts/repo-forgotten.ts";
import { repoReference } from "#rows/repo-reference.ts";

export const forget = command("forget", {
	input: { id: RepoId },
	reads: [repoReference],
	emits: repoForgotten,
	rejections: { Referenced: { id: RepoId, message: Schema.String } },
	run: Effect.fn("repos.forget")(function* (input, rows, reject) {
		if ((yield* rows.repoReference.count({ repoId: input.id })) > 0) {
			return yield* reject.Referenced({ id: input.id, message: "A repository named by a ruling cannot be forgotten" });
		}
		return { id: input.id };
	}),
});
