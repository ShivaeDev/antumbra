import { bind, charterPieceSpec } from "@antumbra/agent-tools";
import { Effect } from "effect";
import { compileBoardTools } from "#board-tools.ts";
import { CaptainMembership } from "#captain-membership.ts";
import { compilePieceVerbTools } from "#captain-pieces.ts";
import { compileCaptainRulingMoveTools } from "#captain-ruling-moves.ts";
import { compileCaptainVerdictTools } from "#captain-verdicts.ts";
import { withNotice } from "#charter-notice.ts";
import { compileReportTools } from "#report-tools.ts";
import { compileRulingReadingTools } from "#ruling-reading-tools.ts";
import { compileRulingTools } from "#ruling-tools.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { compileVoyageReadingTools } from "#voyage-reading-tools.ts";

import { VoyageProcedureService } from "#voyages/service.ts";

export const compileCaptainTools = Effect.fn("AgentToolCompiler.compileCaptainTools")(function* (identity: SessionIdentity) {
	const membership = yield* CaptainMembership;
	const procedures = yield* VoyageProcedureService;
	const pieceVerbTools = yield* compilePieceVerbTools(identity);
	const boardTools = yield* compileBoardTools(identity);
	const reportTools = yield* compileReportTools(identity);
	const rulingTools = yield* compileRulingTools(identity);
	const rulingReadingTools = yield* compileRulingReadingTools(identity);
	const voyageReadingTools = yield* compileVoyageReadingTools(identity);
	const verdictTools = yield* compileCaptainVerdictTools(identity);
	const rulingMoveTools = yield* compileCaptainRulingMoveTools(identity);
	return [
		bind(charterPieceSpec, (input) =>
			membership.onOwnDeps(identity, input.dependsOn, (voyageId) =>
				answered(
					identity,
					charterPieceSpec.name,
					procedures.charterWithNotice({
						charter: input.charter,
						dependsOn: input.dependsOn,
						expectation: input.expectation,
						role: input.role,
						title: input.title,
						voyageId,
					}),
					(chartered) => withNotice(chartered, `chartered ${chartered.piece.id}`),
				),
			),
		),
		...pieceVerbTools,
		...voyageReadingTools,
		...reportTools,
		...boardTools,
		...rulingTools,
		...verdictTools,
		...rulingMoveTools,
		...rulingReadingTools,
	];
});
