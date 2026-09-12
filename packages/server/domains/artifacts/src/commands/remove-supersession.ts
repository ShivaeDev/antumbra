import { command } from "@antumbra/platform-feature/command.ts";
import { Effect } from "effect";
import { endpoints, lineageInput, lineageRejections } from "#commands/lineage.ts";
import { artifactSupersessionRemoved } from "#facts/supersession-removed.ts";
import { artifact } from "#rows/artifact.ts";
export const removeSupersession = command("removeSupersession", {
	input: lineageInput,
	reads: [artifact],
	emits: artifactSupersessionRemoved,
	rejections: lineageRejections,
	run: Effect.fn("Artifacts.removeSupersession")(function* (input, rows, reject) {
		const { before, after } = yield* endpoints(input, rows, reject);
		if (before.supersededByArtifactId !== null && before.supersededByArtifactId !== after.id) {
			return yield* reject.ArtifactSupersessionNotFound({ supersededArtifactId: before.id, successorArtifactId: after.id });
		}
		return input;
	}),
});
