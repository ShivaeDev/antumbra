import type { inputRecorded } from "@antumbra/domain-inputs/facts/recorded.ts";
import { inputOperationId } from "@antumbra/domain-inputs/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const recorded = Effect.fn("inputs.InputRecorded")(function* (fact: FactValue<typeof inputRecorded>): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.session.updateVoid({ ...{ stoppedAt: null }, id: SessionId.make(fact.sessionId) }).pipe(Effect.orDie);
	yield* rows.sessionInput
		.insertVoid({
			id: fact.id,
			sessionId: fact.sessionId,
			requestDigest: fact.requestDigest,
			parts: fact.parts,
			status: "pending",
			detail: null,
			createdAt: fact.at,
		})
		.pipe(Effect.orDie);
	yield* rows.sessionOperation
		.insertVoid({
			id: inputOperationId(fact.id),
			sessionId: SessionId.make(fact.sessionId),
			inputId: fact.id,
			kind: fact.deliveryKind,
			reason: "",
			status: "requested",
			detail: null,
			requestedAt: new Date(fact.at).toISOString(),
			sequence: fact.seq,
			gatedBy: null,
		})
		.pipe(Effect.orDie);
});
