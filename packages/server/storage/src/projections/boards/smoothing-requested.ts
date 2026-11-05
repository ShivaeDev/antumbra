import type { smoothingRequested } from "@antumbra/domain-boards/facts/smoothing-requested.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const smoothingRequestedMaterializer = Effect.fn("boards.SmoothingRequested")(function* (
	fact: FactValue<typeof smoothingRequested>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.smoothingAttempt
		.insertVoid({
			id: fact.id,
			voyageId: fact.voyageId,
			pieceId: fact.pieceId,
			throughToday: fact.throughToday,
			requestedAt: fact.requestedAt,
			by: fact.by,
			status: "requested",
			detail: null,
		})
		.pipe(Effect.orDie);
});
