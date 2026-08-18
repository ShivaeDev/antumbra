import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { validateStoredArtifactLineage } from "#lineage/stored.ts";
import type { ArtifactRow } from "#model.ts";

const relatedArtifacts = (artifacts: ReadonlyArray<ArtifactRow>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const ownIds = new Set(artifacts.map((artifact) => artifact.id));
		const successors = yield* Effect.forEach(
			artifacts.flatMap((artifact) =>
				artifact.supersededByArtifactId === null ||
				ownIds.has(artifact.supersededByArtifactId)
					? []
					: [artifact.supersededByArtifactId],
			),
			(artifactId) => db.Artifact.where({ id: artifactId }).first(),
		);
		const predecessors = yield* Effect.forEach(artifacts, (artifact) =>
			db.Artifact.where({ supersededByArtifactId: artifact.id }).all(),
		);
		return [
			...successors.filter(Option.isSome).map((stored) => stored.value),
			...predecessors.flat(),
		];
	});

export const readValidStoredArtifactLineage = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const ownArtifacts = yield* db.Artifact.where({ pieceId }).all();
		const pieceExists = yield* db.Piece.where({ id: pieceId }).exists();
		const related = yield* relatedArtifacts(ownArtifacts);
		const lineage = {
			artifacts: [
				...new Map(
					[...ownArtifacts, ...related].map((artifact) => [
						artifact.id,
						artifact,
					]),
				).values(),
			],
			pieceIds: new Set(pieceExists ? [pieceId] : []),
		};
		yield* validateStoredArtifactLineage(lineage);
		return lineage;
	});

export const validateCurrentStoredArtifactLineage = (pieceId: string) =>
	readValidStoredArtifactLineage(pieceId).pipe(Effect.asVoid);
