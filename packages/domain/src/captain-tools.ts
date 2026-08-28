import { bind, charterPieceSpec, readVoyageSpec } from "@antumbra/agent-tools";
import { Pieces } from "@antumbra/pieces";
import type { DirectTool } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { makeBoardToolCompiler } from "#board-tools.ts";
import { CaptainMembership } from "#captain-membership.ts";
import { makePieceVerbToolCompiler } from "#captain-pieces.ts";
import { VoyageNotFound } from "#errors.ts";
import { makeReportToolCompiler } from "#report-tools.ts";
import { makeRulingReadingToolCompiler } from "#ruling-reading-tools.ts";
import { makeRulingToolCompiler } from "#ruling-tools.ts";
import { StandDown } from "#stand-down.ts";
import { answered, onVoyage } from "#tool-answers.ts";
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

// why: the captain's set is its authority — it charters and positions work and
// reads where the voyage stands, but it lands no outcomes: workers report,
// captains charter, and the rule is the set rather than a request to behave.
export const makeCaptainToolCompiler = Effect.gen(function* () {
	const membership = yield* CaptainMembership;
	const pieces = yield* Pieces;
	const pieceVerbTools = yield* makePieceVerbToolCompiler;
	const compileBoardTools = yield* makeBoardToolCompiler;
	const compileReportTools = yield* makeReportToolCompiler;
	const compileRulingTools = yield* makeRulingToolCompiler;
	const compileRulingReadingTools = yield* makeRulingReadingToolCompiler;
	const standDown = yield* StandDown;
	const world = yield* VoyageWorldSource;
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
		bind(readVoyageSpec, () =>
			onVoyage(identity, (voyageId) =>
				answered(
					identity,
					readVoyageSpec.name,
					voyageOrGone(voyageId).pipe(
						Effect.provideService(VoyageWorldSource, world),
					),
					renderVoyage,
				),
			),
		),
		...compileReportTools(identity),
		...compileBoardTools(identity),
		...compileRulingTools(identity),
		standDown.tool(identity),
		...compileRulingReadingTools(identity),
	];
});
