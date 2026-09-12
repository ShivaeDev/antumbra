import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { smoothingRequested } from "#facts/smoothing-requested.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

export const smoothingRequestedMaterializer = materializer(smoothingRequested, {
	writes: [smoothingAttempt],
	run: Effect.fn("boards.SmoothingRequested")(function* (fact, rows) {
		yield* rows.smoothingAttempt.insert({
			id: fact.id,
			voyageId: fact.voyageId,
			pieceId: fact.pieceId,
			throughToday: fact.throughToday,
			requestedAt: fact.requestedAt,
			status: "requested",
			detail: null,
		});
	}),
});
