import type { smoothingFinished } from "@antumbra/domain-boards/facts/smoothing-finished.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const smoothingFinishedMaterializer = Effect.fn("boards.SmoothingFinished")(function* (
	fact: FactValue<typeof smoothingFinished>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.smoothingAttempt.updateVoid({ ...{ status: fact.status, detail: fact.detail }, id: fact.id }).pipe(Effect.orDie);
});
