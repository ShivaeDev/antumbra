import { SessionId, SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const sessionStopped = fact("SessionStopped", {
	id: SessionOperationId,
	sessionId: SessionId,
	reason: Schema.String,
	stoppedAt: Schema.String,
});

export const sessionStoppedMaterializer = Effect.fn("sessions.SessionStopped")(function* (
	fact: FactValue<typeof sessionStopped>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.sessionOperation
		.insertVoid({
			id: fact.id,
			sessionId: fact.sessionId,
			kind: "interrupt",
			inputId: null,
			reason: fact.reason,
			status: "requested",
			detail: null,
			requestedAt: fact.stoppedAt,
			sequence: fact.seq,
			gatedBy: null,
		})
		.pipe(Effect.orDie);
	yield* rows.session.updateVoid({ ...{ stoppedAt: fact.stoppedAt }, id: fact.sessionId }).pipe(Effect.orDie);
});
