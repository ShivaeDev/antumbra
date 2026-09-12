import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Option, Schema } from "effect";
import { inputObserved } from "#facts/observed.ts";
import { sessionInput } from "#rows/input.ts";

const inputId = Schema.decodeUnknownOption(SessionInputId);
export const observed = materializer(inputObserved, {
	writes: [sessionInput, sessionOperation],
	run: Effect.fn("inputs.InputDeliveryObserved")(function* (fact, rows) {
		const id = inputId(fact.inputId);
		if (Option.isNone(id)) return;
		const held = yield* rows.sessionInput.find(id.value);
		if (Option.isNone(held) || held.value.sessionId !== fact.sessionId || held.value.status === "accepted" || held.value.status === "ambiguous")
			return;
		const operation = yield* rows.sessionOperation.find(SessionOperationId.make(fact.operationId));
		if (
			Option.isNone(operation) ||
			operation.value.status === "cancelled" ||
			operation.value.inputId !== id.value ||
			operation.value.sessionId !== fact.sessionId
		)
			return;
		yield* rows.sessionInput.update(id.value, { status: fact.status, detail: fact.detail });
	}),
});
