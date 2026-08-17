import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import {
	ArtifactLineageConflict,
	ArtifactNotFound,
	ArtifactProvenanceConflict,
	ArtifactSupersessionUnauthorized,
} from "#errors.ts";
import type {
	ArtifactActor,
	ArtifactRow,
	ArtifactSupersessionRow,
} from "#model.ts";

export const requireArtifact = (artifactId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const stored = yield* db.Artifact.where({ id: artifactId }).first();
		if (Option.isNone(stored)) {
			return yield* new ArtifactNotFound({ artifactId });
		}
		return stored.value;
	});

export const requireAuthority = (
	actor: ArtifactActor,
	superseded: ArtifactRow,
	successor: ArtifactRow,
) => {
	if (
		actor._tag === "admiral" ||
		superseded.authorAgentId === actor.agentId ||
		successor.authorAgentId === actor.agentId
	) {
		return Effect.void;
	}
	return new ArtifactSupersessionUnauthorized({
		actorAgentId: actor.agentId,
		successorArtifactId: successor.id,
		supersededArtifactId: superseded.id,
	});
};

export const requireSharedPiece = (
	superseded: ArtifactRow,
	successor: ArtifactRow,
) =>
	Effect.gen(function* () {
		if (superseded.pieceId !== successor.pieceId) {
			return yield* new ArtifactProvenanceConflict({
				successorArtifactId: successor.id,
				successorPieceId: successor.pieceId,
				supersededArtifactId: superseded.id,
				supersededPieceId: superseded.pieceId,
			});
		}
	});

export const cycleWouldForm = (
	edges: ReadonlyArray<ArtifactSupersessionRow>,
	supersededArtifactId: string,
	successorArtifactId: string,
): boolean => {
	const successorByArtifact = new Map(
		edges.map((edge) => [edge.supersededArtifactId, edge.successorArtifactId]),
	);
	let cursor: string | undefined = successorArtifactId;
	const visited = new Set<string>();
	while (cursor !== undefined) {
		if (cursor === supersededArtifactId) {
			return true;
		}
		if (visited.has(cursor)) {
			return false;
		}
		visited.add(cursor);
		cursor = successorByArtifact.get(cursor);
	}
	return false;
};

export const validateLandingSupersession = (
	supersededArtifactId: string,
	successorArtifactId: string,
	successorPieceId: string,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const superseded = yield* requireArtifact(supersededArtifactId);
		if (superseded.pieceId !== successorPieceId) {
			return yield* new ArtifactProvenanceConflict({
				successorArtifactId,
				successorPieceId,
				supersededArtifactId,
				supersededPieceId: superseded.pieceId,
			});
		}
		const existing = yield* db.ArtifactSupersession.where({
			supersededArtifactId,
		}).first();
		if (Option.isSome(existing)) {
			return yield* new ArtifactLineageConflict({
				conflict: "superseded_artifact_already_has_successor",
				successorArtifactId,
				supersededArtifactId,
			});
		}
	});
