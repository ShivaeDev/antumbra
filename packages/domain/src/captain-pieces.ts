import {
	bind,
	launchPieceSpec,
	parkPieceSpec,
	rewirePieceSpec,
	unparkPieceSpec,
} from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { onOwnDeps, onOwnPiece } from "#captain-membership.ts";
import type { AgentDeps } from "#deps.ts";
import { launchPiece, parkPiece, rewirePiece } from "#pieces.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the verbs that edit a piece's position rather than its substance —
// plans bend, and every one of these is a link edit the record keeps.
export const pieceVerbTools = (
	deps: AgentDeps,
	identity: SessionIdentity,
): ReadonlyArray<DirectTool> => [
	bind(launchPieceSpec, (input) =>
		onOwnPiece(deps, identity, input.pieceId, (pieceId) =>
			answered(
				identity,
				launchPieceSpec.name,
				launchPiece(deps, pieceId),
				() => "launched into the pool",
			),
		),
	),
	bind(parkPieceSpec, (input) =>
		onOwnPiece(deps, identity, input.pieceId, (pieceId) =>
			answered(
				identity,
				parkPieceSpec.name,
				parkPiece(deps, pieceId, true),
				() => "parked",
			),
		),
	),
	bind(unparkPieceSpec, (input) =>
		onOwnPiece(deps, identity, input.pieceId, (pieceId) =>
			answered(
				identity,
				unparkPieceSpec.name,
				parkPiece(deps, pieceId, false),
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
					rewirePiece(deps, pieceId, input.dependsOn),
					() => "rewired",
				),
			),
		),
	),
];
