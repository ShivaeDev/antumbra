import { bind, launchPieceSpec, parkPieceSpec, rewirePieceSpec, unparkPieceSpec } from "@antumbra/agent-tools";
import { Pieces } from "@antumbra/pieces";
import { Effect } from "effect";
import { CaptainMembership } from "#captain-membership.ts";
import { ExecutionSource } from "#execution/service.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { paceWords } from "#voyage-pace.ts";

export const compilePieceVerbTools = Effect.fn("AgentToolCompiler.compilePieceVerbTools")(function* (identity: SessionIdentity) {
	const membership = yield* CaptainMembership;
	const pieces = yield* Pieces;
	const execution = yield* ExecutionSource;
	return [
		bind(launchPieceSpec, (input) =>
			membership.onOwnPiece(identity, input.pieceId, (pieceId, voyageId) =>
				answered(identity, launchPieceSpec.name, pieces.launch(pieceId).pipe(Effect.andThen(execution.voyagePace(voyageId))), (pace) =>
					["launched into the pool", paceWords(pace)].join("\n"),
				),
			),
		),
		bind(parkPieceSpec, (input) =>
			membership.onOwnPiece(identity, input.pieceId, (pieceId) => answered(identity, parkPieceSpec.name, pieces.park(pieceId, true), () => "parked")),
		),
		bind(unparkPieceSpec, (input) =>
			membership.onOwnPiece(identity, input.pieceId, (pieceId) =>
				answered(identity, unparkPieceSpec.name, pieces.park(pieceId, false), () => "unparked"),
			),
		),
		bind(rewirePieceSpec, (input) =>
			membership.onOwnPiece(identity, input.pieceId, (pieceId) =>
				membership.onOwnDeps(identity, input.dependsOn, () =>
					answered(identity, rewirePieceSpec.name, pieces.setDependencies(pieceId, input.dependsOn), () => "rewired"),
				),
			),
		),
	];
});
