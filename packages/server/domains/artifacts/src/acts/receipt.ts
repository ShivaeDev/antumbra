import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import type { ArtifactLandingInput } from "#acts/land.ts";
import { ArtifactId } from "#ids.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
export const landingReceipt = Effect.fn("Artifacts.landingReceipt")(function* (input: ArtifactLandingInput) {
	const live = yield* Live;
	const id = ArtifactId.make(input.requestId);
	const artifact = Option.getOrThrow(yield* Stream.runHead(live.live(byId, { id })));
	const current = Option.getOrThrow(yield* Stream.runHead(live.live(byPiece, { pieceId: input.pieceId })));
	return {
		artifact: Option.getOrThrow(Option.fromNullOr(artifact)),
		otherCurrentArtifacts: current.current.filter((held) => held.id !== id),
		supersededArtifactId: input.supersedesArtifactId,
	};
});
