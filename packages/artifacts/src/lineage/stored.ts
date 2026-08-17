import { Effect } from "effect";
import {
	StoredArtifactLineageInvalid,
	type StoredArtifactLineageInvalidReason,
} from "#errors.ts";
import type { ArtifactRow, ArtifactSupersessionRow } from "#model.ts";

interface StoredArtifactLineage {
	readonly artifacts: ReadonlyArray<ArtifactRow>;
	readonly pieceIds: ReadonlySet<string>;
	readonly supersessions: ReadonlyArray<ArtifactSupersessionRow>;
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
		const successorByArtifact = new Map<string, string>();
		const predecessorByArtifact = new Map<string, string>();
		for (const edge of input.supersessions) {
			const superseded = artifacts.get(edge.supersededArtifactId);
			const successor = artifacts.get(edge.successorArtifactId);
			if (superseded === undefined || successor === undefined) {
				return yield* invalid("endpoint", [
					edge.supersededArtifactId,
					edge.successorArtifactId,
				]);
			}
			if (superseded.pieceId !== successor.pieceId) {
				return yield* invalid(
					"cross_piece",
					[superseded.id, successor.id],
					[superseded.pieceId, successor.pieceId],
				);
			}
			if (
				successorByArtifact.has(superseded.id) ||
				predecessorByArtifact.has(successor.id)
			) {
				return yield* invalid("branch", [superseded.id, successor.id]);
			}
			successorByArtifact.set(superseded.id, successor.id);
			predecessorByArtifact.set(successor.id, superseded.id);
		}
		return successorByArtifact;
	});

const validateAcyclic = (
	artifacts: ReadonlyArray<ArtifactRow>,
	successorByArtifact: ReadonlyMap<string, string>,
) =>
	Effect.gen(function* () {
		for (const artifact of artifacts) {
			const visited = new Set<string>();
			let cursor: string | undefined = artifact.id;
			while (cursor !== undefined) {
				if (visited.has(cursor)) {
					return yield* invalid("cycle", [...visited]);
				}
				visited.add(cursor);
				cursor = successorByArtifact.get(cursor);
			}
		}
	});

export const validateStoredArtifactLineage = (input: StoredArtifactLineage) =>
	Effect.gen(function* () {
		yield* validateProvenance(input);
		const successorByArtifact = yield* validateTopology(input);
		yield* validateAcyclic(input.artifacts, successorByArtifact);
	});
