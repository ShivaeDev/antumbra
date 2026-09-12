import type { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { byId as pieceById } from "@antumbra/domain-pieces/queries/by-id.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { land } from "#commands/land.ts";
import { ArtifactId } from "#ids.ts";
import { ArtifactFiles, ArtifactSource } from "#ports/content.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
export interface ArtifactLandingInput {
	readonly requestId: Request;
	readonly pieceId: PieceId;
	readonly authorAgentId: string;
	readonly path: string;
	readonly title: string;
	readonly supersedesArtifactId: ArtifactId | null;
}
export const landArtifact = Effect.fn("Artifacts.landArtifact")(function* (input: ArtifactLandingInput) {
	const live = yield* Live;
	const piece = Option.getOrThrow(yield* Stream.runHead(live.live(pieceById, { id: input.pieceId })));
	if (piece === null) return yield* new land.Rejection.UnknownPiece({ pieceId: input.pieceId });
	if (input.supersedesArtifactId !== null) {
		const previous = Option.getOrThrow(yield* Stream.runHead(live.live(byId, { id: input.supersedesArtifactId })));
		if (previous === null) return yield* new land.Rejection.ArtifactNotFound({ artifactId: input.supersedesArtifactId });
		if (previous.pieceId !== input.pieceId)
			return yield* new land.Rejection.ArtifactProvenanceConflict({ supersededArtifactId: previous.id, successorPieceId: input.pieceId });
		if (previous.supersededByArtifactId !== null) return yield* new land.Rejection.ArtifactLineageConflict({ artifactId: previous.id });
	}
	const source = yield* (yield* ArtifactSource).read({ authorAgentId: input.authorAgentId, path: input.path });
	const stored = yield* (yield* ArtifactFiles).publish(source);
	yield* (yield* Commit).commit(land, {
		requestId: input.requestId,
		pieceId: input.pieceId,
		authorAgentId: input.authorAgentId,
		title: input.title,
		supersedesArtifactId: input.supersedesArtifactId,
		...stored,
	});
	const id = ArtifactId.make(input.requestId);
	const artifact = Option.getOrThrow(yield* Stream.runHead(live.live(byId, { id })));
	const current = Option.getOrThrow(yield* Stream.runHead(live.live(byPiece, { pieceId: input.pieceId })));
	return {
		artifact: Option.getOrThrow(Option.fromNullOr(artifact)),
		otherCurrentArtifacts: current.current.filter((held) => held.id !== id),
		supersededArtifactId: input.supersedesArtifactId,
	};
});
