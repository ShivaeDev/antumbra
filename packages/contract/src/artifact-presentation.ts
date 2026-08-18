import { Context, type Effect, Schema } from "effect";
import type { SightFailure } from "#sight.ts";

export const OpenArtifactRequest = Schema.Struct({
	artifactId: Schema.String,
});
export type OpenArtifactRequest = typeof OpenArtifactRequest.Type;

export class ArtifactPresentationSource extends Context.Service<
	ArtifactPresentationSource,
	{
		readonly open: (
			request: OpenArtifactRequest,
		) => Effect.Effect<void, SightFailure>;
	}
>()("@antumbra/contract/ArtifactPresentationSource") {}
