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

export const artifactPublicationFailed =
	(operation: string) => (cause: unknown) =>
		new ArtifactPublicationFailed({
			detail: `${operation}: ${String(cause)}`,
		});

export type ArtifactFailure =
	| ArtifactPublicationFailed
	| ArtifactSourceNotOwned
	| PieceNotFound
	| PrismaError;
