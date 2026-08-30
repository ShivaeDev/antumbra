import { bind, charterPieceSpec, readVoyageSpec } from "@antumbra/agent-tools";
import { Pieces } from "@antumbra/pieces";
import type { DirectTool } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { makeBoardToolCompiler } from "#board-tools.ts";
import { CaptainMembership } from "#captain-membership.ts";
import { makePieceVerbToolCompiler } from "#captain-pieces.ts";
import { makeCaptainRulingMoveToolCompiler } from "#captain-ruling-moves.ts";
import { makeCaptainVerdictToolCompiler } from "#captain-verdicts.ts";
import { VoyageNotFound } from "#errors.ts";
import { makeReportToolCompiler } from "#report-tools.ts";
import { makeRulingReadingToolCompiler } from "#ruling-reading-tools.ts";
import { makeRulingToolCompiler } from "#ruling-tools.ts";
import { StandDown } from "#stand-down.ts";
import { answered, onVoyage, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { readVoyageView } from "#voyage-read.ts";
import { renderVoyage } from "#voyage-render.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

const voyageOrGone = (voyageId: string) =>
	readVoyageView(voyageId).pipe(
		Effect.flatMap((view) =>
			Option.match(view, {
				onNone: () => new VoyageNotFound({ voyageId }),
				onSome: (found) => Effect.succeed(found),
			}),
		),
	);

// why: naming another ship is the flagship's widened form of this tool, and a
// captain that never held it hears so rather than being handed its own voyage
// under the id it asked for.
const ACROSS_A_HULL = "only the flagship's captain reads a voyage it is not on";

// why: the captain's set is its authority — it charters and positions work,
// reads where the voyage stands, and settles what its crew brings up, but it
// lands no outcomes: workers report, captains charter, and the rule is the set
// rather than a request to behave.
export const makeCaptainToolCompiler = Effect.gen(function* () {
	const membership = yield* CaptainMembership;
	const pieces = yield* Pieces;
	const pieceVerbTools = yield* makePieceVerbToolCompiler;
	const compileBoardTools = yield* makeBoardToolCompiler;
	const compileReportTools = yield* makeReportToolCompiler;
	const compileRulingTools = yield* makeRulingToolCompiler;
	const compileRulingReadingTools = yield* makeRulingReadingToolCompiler;
	const compileVerdictTools = yield* makeCaptainVerdictToolCompiler;
	const compileRulingMoveTools = yield* makeCaptainRulingMoveToolCompiler;
	const standDown = yield* StandDown;
	const world = yield* VoyageWorldSource;
	const readsVoyage = (identity: SessionIdentity, voyageId: string) =>
		answered(identity, readVoyageSpec.name, voyageOrGone(voyageId).pipe(Effect.provideService(VoyageWorldSource, world)), renderVoyage);
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(charterPieceSpec, (input) =>
			membership.onOwnDeps(identity, input.dependsOn, (voyageId) =>
				answered(
					identity,
					charterPieceSpec.name,
					pieces.charter({
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
		bind(readVoyageSpec, (input) =>
			onVoyage(identity, (voyageId) =>
				input.voyageId === undefined || input.voyageId === voyageId ? readsVoyage(identity, voyageId) : Effect.succeed(refused(ACROSS_A_HULL)),
			),
		),
		...compileReportTools(identity),
		...compileBoardTools(identity),
		...compileRulingTools(identity),
		...compileVerdictTools(identity),
		...compileRulingMoveTools(identity),
		standDown.tool(identity),
		...compileRulingReadingTools(identity),
	];
});
