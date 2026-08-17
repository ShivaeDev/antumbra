import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import {
	StoredArtifactLineageInvalid,
	type StoredArtifactLineageInvalidReason,
} from "#errors.ts";
import type { ArtifactRow, ArtifactSupersessionRow } from "#model.ts";

interface ArtifactProvenanceLink {
	readonly artifactId: string;
	readonly pieceId: string;
}

interface StoredArtifactLineage {
	readonly artifacts: ReadonlyArray<ArtifactRow>;
	readonly links: ReadonlyArray<ArtifactProvenanceLink>;
	readonly supersessions: ReadonlyArray<ArtifactSupersessionRow>;
}

const invalid = (
	reason: StoredArtifactLineageInvalidReason,
	artifactIds: ReadonlyArray<string>,
	pieceIds: ReadonlyArray<string> = [],
) => new StoredArtifactLineageInvalid({ artifactIds, pieceIds, reason });

const provenanceByArtifact = (input: StoredArtifactLineage) => {
	const byArtifact = new Map<string, string[]>();
	for (const link of input.links) {
		const pieces = byArtifact.get(link.artifactId) ?? [];
		pieces.push(link.pieceId);
		byArtifact.set(link.artifactId, pieces);
	}
	return byArtifact;
};

const validateProvenance = (
	artifacts: ReadonlySet<string>,
	piecesByArtifact: ReadonlyMap<string, ReadonlyArray<string>>,
) =>
	Effect.gen(function* () {
		for (const artifactId of artifacts) {
			const pieceIds = piecesByArtifact.get(artifactId) ?? [];
			if (pieceIds.length !== 1) {
				return yield* invalid("provenance", [artifactId], pieceIds);
			}
		}
		for (const artifactId of piecesByArtifact.keys()) {
			if (!artifacts.has(artifactId)) {
				return yield* invalid("provenance", [artifactId]);
			}
		}
	});

const validateTopology = (
	artifacts: ReadonlySet<string>,
	piecesByArtifact: ReadonlyMap<string, ReadonlyArray<string>>,
	supersessions: ReadonlyArray<ArtifactSupersessionRow>,
) =>
	Effect.gen(function* () {
		const successorByArtifact = new Map<string, string>();
		const predecessorByArtifact = new Map<string, string>();
		for (const edge of supersessions) {
			const endpointIds = [edge.supersededArtifactId, edge.successorArtifactId];
			if (endpointIds.some((artifactId) => !artifacts.has(artifactId))) {
				return yield* invalid("endpoint", endpointIds);
			}
			const supersededPieceId = piecesByArtifact.get(
				edge.supersededArtifactId,
			)?.[0];
			const successorPieceId = piecesByArtifact.get(
				edge.successorArtifactId,
			)?.[0];
			if (supersededPieceId !== successorPieceId) {
				return yield* invalid("cross_piece", endpointIds, [
					supersededPieceId ?? "",
					successorPieceId ?? "",
				]);
			}
			if (
				successorByArtifact.has(edge.supersededArtifactId) ||
				predecessorByArtifact.has(edge.successorArtifactId)
			) {
				return yield* invalid("branch", endpointIds);
			}
			successorByArtifact.set(
				edge.supersededArtifactId,
				edge.successorArtifactId,
			);
			predecessorByArtifact.set(
				edge.successorArtifactId,
				edge.supersededArtifactId,
			);
		}
		return successorByArtifact;
	});

const validateAcyclic = (
	artifacts: ReadonlySet<string>,
	successorByArtifact: ReadonlyMap<string, string>,
) =>
	Effect.gen(function* () {
		for (const artifactId of artifacts) {
			const visited = new Set<string>();
			let cursor: string | undefined = artifactId;
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
		const artifacts = new Set(input.artifacts.map((artifact) => artifact.id));
		const piecesByArtifact = provenanceByArtifact(input);
		yield* validateProvenance(artifacts, piecesByArtifact);
		const successorByArtifact = yield* validateTopology(
			artifacts,
			piecesByArtifact,
			input.supersessions,
		);
		yield* validateAcyclic(artifacts, successorByArtifact);
	});

export const validateCurrentStoredArtifactLineage = Effect.gen(function* () {
	const db = yield* Database;
	yield* validateStoredArtifactLineage({
		artifacts: yield* db.Artifact.all(),
		links: yield* db.PieceArtifact.all(),
		supersessions: yield* db.ArtifactSupersession.all(),
	});
});
