import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { smoothingFinished } from "#facts/smoothing-finished.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const smoothingFinishedMaterializer = materializer(smoothingFinished, {
	writes: [smoothingAttempt],
	run: Effect.fn("boards.SmoothingFinished")(function* (fact, rows) {
		yield* rows.smoothingAttempt.update(fact.id, { status: fact.status, detail: fact.detail });
	}),
});
