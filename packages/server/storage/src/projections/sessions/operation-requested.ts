import type { operationRequested } from "@antumbra/domain-sessions/facts/operation-requested.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const operationRequestedMaterializer = Effect.fn("sessions.operationRequested")(function* (
	fact: FactValue<typeof operationRequested>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const { id, sessionId, kind, inputId, reason, status, detail, requestedAt } = fact;
	yield* rows.sessionOperation
		.insertVoid({ id, sessionId, kind, inputId, reason, status, detail, requestedAt, sequence: fact.seq, gatedBy: null })
		.pipe(Effect.orDie);
});
