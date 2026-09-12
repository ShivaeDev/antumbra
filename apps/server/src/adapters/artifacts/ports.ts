import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import type { StoredArtifactContentInvalid } from "@antumbra/domain-artifacts/queries/content.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Context, type Effect } from "effect";
import type { ArtifactContentInvalid, ArtifactPublicationFailed, ArtifactSourceNotOwned } from "#adapters/artifacts/errors.ts";
export interface PublishedArtifact {
	readonly basename: string;
	readonly digest: string;
	readonly byteSize: number;
}
export interface ArtifactBytes {
	readonly basename: string;
	readonly bytes: Uint8Array;
}
export class ArtifactSource extends Context.Service<
	ArtifactSource,
	{
		readonly read: (input: {
			readonly requestId: Request;
			readonly authorAgentId: string;
			readonly path: string;
		}) => Effect.Effect<ArtifactBytes, ArtifactSourceNotOwned | ArtifactContentInvalid | ArtifactPublicationFailed>;
	}
>()("@antumbra/server/ArtifactSource") {}
export class ArtifactFiles extends Context.Service<
	ArtifactFiles,
	{
		readonly publish: (source: ArtifactBytes) => Effect.Effect<PublishedArtifact, ArtifactPublicationFailed>;
		readonly read: (input: PublishedArtifact & { readonly id: ArtifactId }) => Effect.Effect<string, StoredArtifactContentInvalid>;
	}
>()("@antumbra/server/ArtifactFiles") {}
