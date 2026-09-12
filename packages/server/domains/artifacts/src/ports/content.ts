import { Context, type Effect } from "effect";
import type { ArtifactContentInvalid, ArtifactPublicationFailed, ArtifactSourceNotOwned, StoredArtifactContentInvalid } from "#content.ts";
import type { ArtifactId } from "#ids.ts";
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
			readonly authorAgentId: string;
			readonly path: string;
		}) => Effect.Effect<ArtifactBytes, ArtifactSourceNotOwned | ArtifactContentInvalid | ArtifactPublicationFailed>;
	}
>()("@antumbra/domain-artifacts/ArtifactSource") {}
export class ArtifactFiles extends Context.Service<
	ArtifactFiles,
	{
		readonly publish: (source: ArtifactBytes) => Effect.Effect<PublishedArtifact, ArtifactPublicationFailed>;
		readonly read: (input: PublishedArtifact & { readonly id: ArtifactId }) => Effect.Effect<string, StoredArtifactContentInvalid>;
	}
>()("@antumbra/domain-artifacts/ArtifactFiles") {}
