import {
	bind,
	launchPieceSpec,
	parkPieceSpec,
	rewirePieceSpec,
	unparkPieceSpec,
} from "@antumbra/agent-tools";
import { Pieces } from "@antumbra/pieces";
import type { DirectTool } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { onOwnDeps, onOwnPiece } from "#captain-membership.ts";
import type { AgentDeps } from "#deps.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the verbs that edit a piece's position rather than its substance —
// plans bend, and every one of these is a link edit the record keeps.
export const makePieceVerbToolCompiler = Effect.gen(function* () {
	const pieces = yield* Pieces;
	return (
		deps: AgentDeps,
		identity: SessionIdentity,
	): ReadonlyArray<DirectTool> => [
		bind(launchPieceSpec, (input) =>
			onOwnPiece(deps, identity, input.pieceId, (pieceId) =>
				answered(
					identity,
					launchPieceSpec.name,
					pieces.launch(pieceId),
					() => "launched into the pool",
				),
			),
		),
		bind(parkPieceSpec, (input) =>
			onOwnPiece(deps, identity, input.pieceId, (pieceId) =>
				answered(
					identity,
					parkPieceSpec.name,
					pieces.park(pieceId, true),
					() => "parked",
				),
			),
		),
		bind(unparkPieceSpec, (input) =>
			onOwnPiece(deps, identity, input.pieceId, (pieceId) =>
				answered(
					identity,
					unparkPieceSpec.name,
					pieces.park(pieceId, false),
					() => "unparked",
				),
			),
		),
		bind(rewirePieceSpec, (input) =>
			onOwnPiece(deps, identity, input.pieceId, (pieceId) =>
				onOwnDeps(deps, identity, input.dependsOn, () =>
					answered(
						identity,
						rewirePieceSpec.name,
						pieces.setDependencies(pieceId, input.dependsOn),
						() => "rewired",
					),
				),
			),
		),
	];
});
