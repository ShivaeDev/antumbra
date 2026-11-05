import { land } from "@antumbra/domain-artifacts/commands/land.ts";
import { ArtifactSource } from "@antumbra/domain-artifacts/ports/files.ts";
import { byId } from "@antumbra/domain-artifacts/queries/by-id.ts";
import type { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { byId as pieceById } from "@antumbra/domain-pieces/queries/by-id.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Artifacts } from "@antumbra/server-artifacts/service.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Effect, Option, Stream } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { landingReceipt } from "#adapters/artifacts/acts/receipt.ts";
import { keysOf } from "#keys.ts";
export interface ArtifactLandingInput {
	readonly requestId: Request;
	readonly pieceId: PieceId;
	readonly authorAgentId: string;
	readonly path: string;
	readonly title: string;
	readonly supersedesArtifactId: ArtifactId | null;
}
export const landArtifact = Effect.fn("Artifacts.landArtifact")(function* (input: ArtifactLandingInput) {
	const artifactsService = yield* Artifacts;
	const piecesService = yield* Pieces;

	const existing = Option.getOrThrow(
		yield* Stream.runHead(
			stream(keysOf(byId.reads, byId.scope?.({ id: ArtifactId.make(input.requestId) })))(
				artifactsService.byId({ id: ArtifactId.make(input.requestId) }).pipe(Effect.orDie),
			),
		),
	);
	if (existing !== null) return yield* landingReceipt(input);
	const piece = Option.getOrThrow(
		yield* Stream.runHead(
			stream(keysOf(pieceById.reads, pieceById.scope?.({ id: input.pieceId })))(piecesService.byId({ id: input.pieceId }).pipe(Effect.orDie)),
		),
	);
	if (piece === null) return yield* new land.Rejection.UnknownPiece({ pieceId: input.pieceId });
	if (input.supersedesArtifactId !== null) {
		const previous = Option.getOrThrow(
			yield* Stream.runHead(
				stream(keysOf(byId.reads, byId.scope?.({ id: input.supersedesArtifactId })))(
					artifactsService.byId({ id: input.supersedesArtifactId }).pipe(Effect.orDie),
				),
			),
		);
		if (previous === null) return yield* new land.Rejection.ArtifactNotFound({ artifactId: input.supersedesArtifactId });
		if (previous.pieceId !== input.pieceId)
			return yield* new land.Rejection.ArtifactProvenanceConflict({ supersededArtifactId: previous.id, successorPieceId: input.pieceId });
		if (previous.supersededByArtifactId !== null) return yield* new land.Rejection.ArtifactLineageConflict({ artifactId: previous.id });
	}
	const source = yield* (yield* ArtifactSource).read({ requestId: input.requestId, authorAgentId: input.authorAgentId, path: input.path });

	yield* artifactsService
		.land({
			requestId: input.requestId,
			pieceId: input.pieceId,
			authorAgentId: input.authorAgentId,
			title: input.title,
			supersedesArtifactId: input.supersedesArtifactId,
			bytes: source.bytes,
			basename: source.basename,
		})
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	return yield* landingReceipt(input);
});
