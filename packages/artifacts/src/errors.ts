import type { PrismaError } from "@antumbra/persistence";
import type { PieceNotFound } from "@antumbra/pieces";
import type { StoredMoorageStatusInvalid } from "@antumbra/vocabulary/agent-runtime";
import { Data } from "effect";
import type { ArtifactContentInvalidReason } from "#content.ts";

export class ArtifactSourceNotOwned extends Data.TaggedError("ArtifactSourceNotOwned")<{
	readonly agentId: string | null;
	readonly path: string;
}> {}

export class ArtifactContentInvalid extends Data.TaggedError("ArtifactContentInvalid")<{
	readonly path: string;
	readonly reason: ArtifactContentInvalidReason;
}> {}

export class ArtifactPublicationFailed extends Data.TaggedError("ArtifactPublicationFailed")<{
	readonly detail: string;
}> {}

export class ArtifactNotFound extends Data.TaggedError("ArtifactNotFound")<{
	readonly artifactId: string;
}> {}

export type StoredArtifactContentInvalidReason = "basename" | "digest" | "missing" | "not_file" | "not_utf8" | "path" | "size" | "too_large";

export class StoredArtifactContentInvalid extends Data.TaggedError("StoredArtifactContentInvalid")<{
	readonly artifactId: string;
	readonly reason: StoredArtifactContentInvalidReason;
}> {}

export class ArtifactProvenanceConflict extends Data.TaggedError("ArtifactProvenanceConflict")<{
	readonly successorArtifactId: string;
	readonly successorPieceId: string;
	readonly supersededArtifactId: string;
	readonly supersededPieceId: string;
}> {}

type ArtifactLineageConflictKind = "cycle" | "successor_artifact_already_has_predecessor" | "superseded_artifact_already_has_successor";

export class ArtifactLineageConflict extends Data.TaggedError("ArtifactLineageConflict")<{
	readonly conflict: ArtifactLineageConflictKind;
	readonly successorArtifactId: string;
	readonly supersededArtifactId: string;
}> {}

export class ArtifactSupersessionNotFound extends Data.TaggedError("ArtifactSupersessionNotFound")<{
	readonly successorArtifactId: string;
	readonly supersededArtifactId: string;
}> {}

export class ArtifactSupersessionUnauthorized extends Data.TaggedError("ArtifactSupersessionUnauthorized")<{
	readonly actorAgentId: string;
	readonly successorArtifactId: string;
	readonly supersededArtifactId: string;
}> {}

export const artifactPublicationFailed = (operation: string) => (cause: unknown) =>
	new ArtifactPublicationFailed({
		detail: `${operation}: ${String(cause)}`,
	});

export type ArtifactFailure =
	| ArtifactContentInvalid
	| ArtifactLineageConflict
	| ArtifactNotFound
	| ArtifactPublicationFailed
	| ArtifactProvenanceConflict
	| ArtifactSourceNotOwned
	| ArtifactSupersessionNotFound
	| ArtifactSupersessionUnauthorized
	| PieceNotFound
	| PrismaError
	| StoredArtifactContentInvalid
	| StoredMoorageStatusInvalid;
