import { command } from "@antumbra/platform-feature/command.ts";
import { Effect } from "effect";
import { endpoints, lineageInput, lineageRejections } from "#commands/lineage.ts";
import { artifactSuperseded } from "#facts/superseded.ts";
import type { ArtifactId } from "#ids.ts";
import { artifact } from "#rows/artifact.ts";
export const supersede = command("supersede", {
	input: lineageInput,
	reads: [artifact],
	emits: artifactSuperseded,
	rejections: lineageRejections,
	run: Effect.fn("Artifacts.supersede")(function* (input, rows, reject) {
		const { before, after } = yield* endpoints(input, rows, reject);
		if (before.supersededByArtifactId === after.id) return input;
		if (before.supersededByArtifactId !== null)
			return yield* reject.ArtifactLineageConflict({ conflict: "superseded_artifact_already_has_successor" });
		if ((yield* rows.artifact.count({ supersededByArtifactId: after.id })) > 0)
			return yield* reject.ArtifactLineageConflict({ conflict: "successor_artifact_already_has_predecessor" });
		const held = yield* rows.artifact.where({ pieceId: before.pieceId });
		const successor = new Map(held.map((entry) => [entry.id, entry.supersededByArtifactId]));
		let cursor: ArtifactId | null = after.id;
		while (cursor !== null) {
			if (cursor === before.id) return yield* reject.ArtifactLineageConflict({ conflict: "cycle" });
			cursor = successor.get(cursor) ?? null;
		}
		return input;
	}),
});
