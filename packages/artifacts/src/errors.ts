import type { StoredMoorageStatusInvalid } from "@antumbra/agent-runtime-vocabulary";
import type { PrismaError } from "@antumbra/persistence";
import type { PieceNotFound } from "@antumbra/pieces";
import { Data } from "effect";

export class ArtifactSourceNotOwned extends Data.TaggedError(
	"ArtifactSourceNotOwned",
)<{
	readonly agentId: string | null;
	readonly uri: string;
}> {}

export class ArtifactPublicationFailed extends Data.TaggedError(
	"ArtifactPublicationFailed",
)<{
	readonly detail: string;
}> {}

export class ArtifactNotFound extends Data.TaggedError("ArtifactNotFound")<{
	readonly artifactId: string;
}> {}

export class ArtifactProvenanceConflict extends Data.TaggedError(
	"ArtifactProvenanceConflict",
)<{
	readonly successorArtifactId: string;
	readonly successorPieceId: string;
	readonly supersededArtifactId: string;
	readonly supersededPieceId: string;
}> {}

export class ArtifactProvenanceInvalid extends Data.TaggedError(
	"ArtifactProvenanceInvalid",
)<{
	readonly artifactId: string;
	readonly pieceIds: ReadonlyArray<string>;
}> {}

export type ArtifactLineageConflictKind =
	| "cycle"
	| "successor_artifact_already_has_predecessor"
	| "superseded_artifact_already_has_successor";

export class ArtifactLineageConflict extends Data.TaggedError(
	"ArtifactLineageConflict",
)<{
	readonly conflict: ArtifactLineageConflictKind;
	readonly successorArtifactId: string;
	readonly supersededArtifactId: string;
}> {}

export class ArtifactSupersessionNotFound extends Data.TaggedError(
	"ArtifactSupersessionNotFound",
)<{
	readonly successorArtifactId: string;
	readonly supersededArtifactId: string;
}> {}

export class ArtifactSupersessionUnauthorized extends Data.TaggedError(
	"ArtifactSupersessionUnauthorized",
)<{
	readonly actorAgentId: string;
	readonly successorArtifactId: string;
	readonly supersededArtifactId: string;
}> {}

export const artifactPublicationFailed =
	(operation: string) => (cause: unknown) =>
		new ArtifactPublicationFailed({
			detail: `${operation}: ${String(cause)}`,
		});

export type ArtifactFailure =
	| ArtifactLineageConflict
	| ArtifactNotFound
	| ArtifactPublicationFailed
	| ArtifactProvenanceConflict
	| ArtifactProvenanceInvalid
	| ArtifactSourceNotOwned
	| ArtifactSupersessionNotFound
	| ArtifactSupersessionUnauthorized
	| PieceNotFound
	| PrismaError
	| StoredMoorageStatusInvalid;
