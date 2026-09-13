import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { inputRecorded } from "#facts/recorded.ts";
import { inputOperationId } from "#ids.ts";
import { sessionInput } from "#rows/input.ts";
export const recorded = materializer(inputRecorded, {
	writes: [sessionInput, sessionOperation],
	run: Effect.fn("inputs.InputRecorded")(function* (fact, rows) {
		yield* rows.sessionInput.insert({
			id: fact.id,
			sessionId: fact.sessionId,
			requestDigest: fact.requestDigest,
			parts: fact.parts,
			status: "pending",
			detail: null,
			createdAt: fact.at,
		});
		yield* rows.sessionOperation.insert({
			id: inputOperationId(fact.id),
			sessionId: SessionId.make(fact.sessionId),
			inputId: fact.id,
			kind: fact.deliveryKind,
			reason: "",
			status: "requested",
			detail: null,
			requestedAt: new Date(fact.at).toISOString(),
			sequence: fact.seq,
		});
	}),
});
