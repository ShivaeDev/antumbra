import type { Effect } from "effect";
import type { Artifacts } from "#service.ts";
export const unexpectedReadContent = (error: Effect.Error<ReturnType<typeof Artifacts.Service.readContent>>) =>
	error._tag !== "ArtifactNotFound" && error._tag !== "StoredArtifactContentInvalid";
export const unexpectedSupersede = (error: Effect.Error<ReturnType<typeof Artifacts.Service.supersede>>) =>
	error._tag !== "ArtifactNotFound" &&
	error._tag !== "ArtifactProvenanceConflict" &&
	error._tag !== "ArtifactSupersessionUnauthorized" &&
	error._tag !== "ArtifactLineageConflict" &&
	error._tag !== "ArtifactSupersessionNotFound" &&
	error._tag !== "AlreadyDone";
export const unexpectedRemoveSupersession = (error: Effect.Error<ReturnType<typeof Artifacts.Service.removeSupersession>>) =>
	error._tag !== "ArtifactNotFound" &&
	error._tag !== "ArtifactProvenanceConflict" &&
	error._tag !== "ArtifactSupersessionUnauthorized" &&
	error._tag !== "ArtifactLineageConflict" &&
	error._tag !== "ArtifactSupersessionNotFound" &&
	error._tag !== "AlreadyDone";
export const unexpectedLand = (error: Effect.Error<ReturnType<typeof Artifacts.Service.land>>) =>
	error._tag !== "UnknownPiece" &&
	error._tag !== "ArtifactNotFound" &&
	error._tag !== "ArtifactProvenanceConflict" &&
	error._tag !== "ArtifactLineageConflict" &&
	error._tag !== "AlreadyDone" &&
	error._tag !== "ArtifactPublicationFailed";
