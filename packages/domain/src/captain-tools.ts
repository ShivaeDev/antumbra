import { bind, charterPieceSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { makeBoardToolCompiler } from "#board-tools.ts";
import { CaptainMembership } from "#captain-membership.ts";
import { makePieceVerbToolCompiler } from "#captain-pieces.ts";
import { makeCaptainRulingMoveToolCompiler } from "#captain-ruling-moves.ts";
import { makeCaptainVerdictToolCompiler } from "#captain-verdicts.ts";
import { makeEdgeCharter } from "#charter-edge.ts";
import { makeReportToolCompiler } from "#report-tools.ts";
import { makeRulingReadingToolCompiler } from "#ruling-reading-tools.ts";
import { makeRulingToolCompiler } from "#ruling-tools.ts";
import { StandDown } from "#stand-down.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { makeVoyageReadingToolCompiler } from "#voyage-reading-tools.ts";

export const makeCaptainToolCompiler = Effect.gen(function* () {
	const membership = yield* CaptainMembership;
	const charter = yield* makeEdgeCharter;
	const pieceVerbTools = yield* makePieceVerbToolCompiler;
	const compileBoardTools = yield* makeBoardToolCompiler;
	const compileReportTools = yield* makeReportToolCompiler;
	const compileRulingTools = yield* makeRulingToolCompiler;
	const compileRulingReadingTools = yield* makeRulingReadingToolCompiler;
	const compileVoyageReadingTools = yield* makeVoyageReadingToolCompiler;
	const compileVerdictTools = yield* makeCaptainVerdictToolCompiler;
	const compileRulingMoveTools = yield* makeCaptainRulingMoveToolCompiler;
	const standDown = yield* StandDown;
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(charterPieceSpec, (input) =>
			membership.onOwnDeps(identity, input.dependsOn, (voyageId) =>
				answered(
					identity,
					charterPieceSpec.name,
					charter({
						charter: input.charter,
						dependsOn: input.dependsOn,
						expectation: input.expectation,
						role: input.role,
						title: input.title,
						voyageId,
					}),
					(piece) => `chartered ${piece.id}`,
				),
			),
		),
		...pieceVerbTools(identity),
		...compileVoyageReadingTools(identity),
		...compileReportTools(identity),
		...compileBoardTools(identity),
		...compileRulingTools(identity),
		...compileVerdictTools(identity),
		...compileRulingMoveTools(identity),
		standDown.tool(identity),
		...compileRulingReadingTools(identity),
	];
});
