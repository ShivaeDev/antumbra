import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import {
	ArtifactLineageConflict,
	ArtifactNotFound,
	ArtifactProvenanceConflict,
	ArtifactProvenanceInvalid,
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

export const requirePieceId = (artifactId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const links = yield* db.PieceArtifact.where({ artifactId }).all();
		if (links.length !== 1) {
			return yield* new ArtifactProvenanceInvalid({
				artifactId,
				pieceIds: links.map((link) => link.pieceId),
			});
		}
		return links[0]?.pieceId ?? "";
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
	supersededArtifactId: string,
	successorArtifactId: string,
) =>
	Effect.gen(function* () {
		const supersededPieceId = yield* requirePieceId(supersededArtifactId);
		const successorPieceId = yield* requirePieceId(successorArtifactId);
		if (supersededPieceId !== successorPieceId) {
			return yield* new ArtifactProvenanceConflict({
				successorArtifactId,
				successorPieceId,
				supersededArtifactId,
				supersededPieceId,
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
	while (cursor !== undefined) {
		if (cursor === supersededArtifactId) {
			return true;
		}
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
		yield* requireArtifact(supersededArtifactId);
		const supersededPieceId = yield* requirePieceId(supersededArtifactId);
		if (supersededPieceId !== successorPieceId) {
			return yield* new ArtifactProvenanceConflict({
				successorArtifactId,
				successorPieceId,
				supersededArtifactId,
				supersededPieceId,
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
