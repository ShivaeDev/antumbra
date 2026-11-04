import type { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { SessionOperationId } from "@antumbra/platform-vocabulary/session-ids.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Option, Schema } from "effect";
import type { rows } from "#postgres/inputs/rows.ts";

const inputId = Schema.decodeUnknownOption(SessionInputId);

type Rows = Effect.Success<typeof rows>;
export const projectInputDeliveryObserved = (rows: Rows) =>
	Effect.fn("InputsHistory.projectInputDeliveryObserved")(function* (
		fact: Extract<typeof InputsEvent.Type, { readonly _tag: "InputDeliveryObserved" }>,
	) {
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
	});
