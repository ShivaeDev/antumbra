import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const readStoredArtifactLineage = Effect.fn("Artifacts.readStoredArtifactLineage")(function* (pieceId: string) {
	const db = yield* Database;
	const ownArtifacts = yield* db.Artifact.where({ pieceId }).all();
	const ownIds = new Set(ownArtifacts.map((artifact) => artifact.id));
	const successorIds = ownArtifacts.flatMap((artifact) =>
		artifact.supersededByArtifactId === null || ownIds.has(artifact.supersededByArtifactId) ? [] : [artifact.supersededByArtifactId],
	);
	const successors = yield* db.Artifact.where((artifact) => artifact.id.in(successorIds)).all();
	const predecessors = yield* db.Artifact.where((artifact) => artifact.supersededByArtifactId.in([...ownIds])).all();
	return {
		artifacts: [...new Map([...ownArtifacts, ...successors, ...predecessors].map((artifact) => [artifact.id, artifact])).values()],
	};
});
