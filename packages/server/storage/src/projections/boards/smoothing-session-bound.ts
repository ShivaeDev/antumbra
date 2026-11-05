import type { smoothingSessionBound } from "@antumbra/domain-boards/facts/smoothing-session-bound.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const smoothingSessionBoundMaterializer = Effect.fn("boards.SmoothingSessionBound")(function* (
	fact: FactValue<typeof smoothingSessionBound>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.smoothingSession
		.insertVoid({
			sessionId: fact.sessionId,
			attemptId: fact.attemptId,
			agentId: fact.agentId,
			board: fact.board,
			pieceId: fact.pieceId,
			title: fact.title,
			level: fact.level,
			coversFrom: fact.coversFrom,
			coversTo: fact.coversTo,
			status: "waiting",
		})
		.pipe(Effect.orDie);
});
