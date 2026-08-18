import { ArtifactPresentationSource, SightFailure } from "@antumbra/contract";
import { AgentDomain } from "@antumbra/domain";
import { Effect, Layer } from "effect";
import { openArtifactViewer } from "#adapters/artifact-viewer-window.ts";

interface PresentationFailure {
	readonly _tag: string;
	readonly detail?: unknown;
	readonly reason?: unknown;
}

const failureMessage = (failure: PresentationFailure): string => {
	if ("reason" in failure && typeof failure.reason === "string") {
		return `${failure._tag}: ${failure.reason}`;
	}
	if ("detail" in failure && typeof failure.detail === "string") {
		return `${failure._tag}: ${failure.detail}`;
	}
	return failure._tag;
};

const asSightFailure = (failure: PresentationFailure): SightFailure =>
	new SightFailure({
		message: `Artifact unavailable: ${failureMessage(failure)}`,
	});

export const ArtifactPresentationSourceLive = Layer.effect(
	ArtifactPresentationSource,
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return {
			open: ({ artifactId }) =>
				domain
					.readArtifactMarkdown(artifactId)
					.pipe(
						Effect.flatMap(openArtifactViewer),
						Effect.mapError(asSightFailure),
					),
		};
	}),
);
