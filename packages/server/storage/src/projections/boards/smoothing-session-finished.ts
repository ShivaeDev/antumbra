import type { smoothingSessionFinished } from "@antumbra/domain-boards/facts/smoothing-session-finished.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const smoothingSessionFinishedMaterializer = Effect.fn("boards.SmoothingSessionFinished")(function* (
	fact: FactValue<typeof smoothingSessionFinished>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.smoothingSession.updateVoid({ ...{ status: fact.status }, sessionId: fact.sessionId }).pipe(Effect.orDie);
});
