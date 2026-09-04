import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";

export const readStoredArtifactLineage = Effect.fn("Artifacts.readStoredArtifactLineage")(function* (pieceId: string) {
	const db = yield* Database;
	const ownArtifacts = yield* db.Artifact.where({ pieceId }).all();
	const ownIds = new Set(ownArtifacts.map((artifact) => artifact.id));
	const successors = yield* Effect.forEach(
		ownArtifacts.flatMap((artifact) =>
			artifact.supersededByArtifactId === null || ownIds.has(artifact.supersededByArtifactId) ? [] : [artifact.supersededByArtifactId],
		),
		(artifactId) => db.Artifact.where({ id: artifactId }).first(),
	);
	const predecessors = yield* Effect.forEach(ownArtifacts, (artifact) => db.Artifact.where({ supersededByArtifactId: artifact.id }).all());
	return {
		artifacts: [
			...new Map(
				[...ownArtifacts, ...successors.filter(Option.isSome).map((stored) => stored.value), ...predecessors.flat()].map((artifact) => [
					artifact.id,
					artifact,
				]),
			).values(),
		],
	};
});
