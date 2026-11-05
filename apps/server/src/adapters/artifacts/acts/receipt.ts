import { byId } from "@antumbra/domain-artifacts/queries/by-id.ts";
import { byPiece } from "@antumbra/domain-artifacts/queries/by-piece.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Artifacts } from "@antumbra/server-artifacts/service.ts";
import { Effect, Option, Stream } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import type { ArtifactLandingInput } from "#adapters/artifacts/acts/land.ts";
import { keysOf } from "#keys.ts";
export const landingReceipt = Effect.fn("Artifacts.landingReceipt")(function* (input: ArtifactLandingInput) {
	const artifactsService = yield* Artifacts;

	const id = ArtifactId.make(input.requestId);
	const artifact = Option.getOrThrow(
		yield* Stream.runHead(stream(keysOf(byId.reads, byId.scope?.({ id })))(artifactsService.byId({ id }).pipe(Effect.orDie))),
	);
	const current = Option.getOrThrow(
		yield* Stream.runHead(
			stream(keysOf(byPiece.reads, byPiece.scope?.({ pieceId: input.pieceId })))(
				artifactsService.byPiece({ pieceId: input.pieceId }).pipe(Effect.orDie),
			),
		),
	);
	return {
		artifact: Option.getOrThrow(Option.fromNullOr(artifact)),
		otherCurrentArtifacts: current.current.filter((held) => held.id !== id),
		supersededArtifactId: input.supersedesArtifactId,
	};
});
