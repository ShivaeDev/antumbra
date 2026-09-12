import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { smoothingSessionFinished } from "#facts/smoothing-session-finished.ts";
import { smoothingSession } from "#rows/smoothing-session.ts";

export const smoothingSessionFinishedMaterializer = materializer(smoothingSessionFinished, {
	writes: [smoothingSession],
	run: Effect.fn("boards.SmoothingSessionFinished")(function* (fact, rows) {
		yield* rows.smoothingSession.update(fact.sessionId, { status: fact.status });
	}),
});
