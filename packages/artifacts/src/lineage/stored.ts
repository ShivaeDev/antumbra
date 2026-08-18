import { Effect } from "effect";
import {
	StoredArtifactLineageInvalid,
	type StoredArtifactLineageInvalidReason,
} from "#errors.ts";
import type { ArtifactRow } from "#model.ts";

interface StoredArtifactLineage {
	readonly artifacts: ReadonlyArray<ArtifactRow>;
	readonly pieceIds: ReadonlySet<string>;
}

const invalid = (
	reason: StoredArtifactLineageInvalidReason,
	artifactIds: ReadonlyArray<string>,
	pieceIds: ReadonlyArray<string> = [],
) => new StoredArtifactLineageInvalid({ artifactIds, pieceIds, reason });

const validateProvenance = (input: StoredArtifactLineage) =>
	Effect.gen(function* () {
		for (const artifact of input.artifacts) {
			if (!input.pieceIds.has(artifact.pieceId)) {
				return yield* invalid("provenance", [artifact.id], [artifact.pieceId]);
			}
		}
	});

const validateTopology = (input: StoredArtifactLineage) =>
	Effect.gen(function* () {
		const artifacts = new Map(input.artifacts.map((row) => [row.id, row]));
		const predecessorByArtifact = new Map<string, string>();
		for (const artifact of input.artifacts) {
			const successorId = artifact.supersededByArtifactId;
			if (successorId === null) {
				continue;
			}
			const successor = artifacts.get(successorId);
			if (successor === undefined) {
				return yield* invalid("endpoint", [artifact.id, successorId]);
			}
			if (artifact.pieceId !== successor.pieceId) {
				return yield* invalid(
					"cross_piece",
					[artifact.id, successor.id],
					[artifact.pieceId, successor.pieceId],
				);
			}
			if (predecessorByArtifact.has(successor.id)) {
				return yield* invalid("branch", [artifact.id, successor.id]);
			}
			predecessorByArtifact.set(successor.id, artifact.id);
		}
	});

const validateAcyclic = (artifacts: ReadonlyArray<ArtifactRow>) =>
	Effect.gen(function* () {
		const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
		for (const artifact of artifacts) {
			const visited = new Set<string>();
			let cursor: string | null = artifact.id;
			while (cursor !== null) {
				if (visited.has(cursor)) {
					return yield* invalid("cycle", [...visited]);
				}
				visited.add(cursor);
				cursor = byId.get(cursor)?.supersededByArtifactId ?? null;
			}
		}
	});

export const validateStoredArtifactLineage = (input: StoredArtifactLineage) =>
	Effect.gen(function* () {
		yield* validateProvenance(input);
		yield* validateTopology(input);
		yield* validateAcyclic(input.artifacts);
	});
