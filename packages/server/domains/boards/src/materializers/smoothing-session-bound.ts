import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { smoothingSessionBound } from "#facts/smoothing-session-bound.ts";
import { smoothingSession } from "#rows/smoothing-session.ts";

export const smoothingSessionBoundMaterializer = materializer(smoothingSessionBound, {
	writes: [smoothingSession],
	run: Effect.fn("boards.SmoothingSessionBound")(function* (fact, rows) {
		yield* rows.smoothingSession.insert({
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
		});
	}),
});
