import type { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/inputs/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectInputRetried = (rows: Rows) =>
	Effect.fn("InputsHistory.projectInputRetried")(function* (
		fact: Extract<typeof InputsEvent.Type, { readonly _tag: "InputRetried" }>,
		streamVersion: number,
	) {
		yield* rows.sessionInput.update(fact.id, { status: "pending", detail: null });
		const previous = yield* rows.sessionOperation.where({ inputId: fact.id });
		for (const operation of previous) {
			if (operation.status === "waiting") yield* rows.sessionOperation.update(operation.id, { status: "cancelled" });
		}
		yield* rows.sessionOperation.insert({
			id: fact.operationId,
			sessionId: fact.sessionId,
			inputId: fact.id,
			kind: fact.deliveryKind,
			reason: "",
			status: "requested",
			detail: null,
			requestedAt: new Date(fact.at).toISOString(),
			sequence: fact.sequence ?? streamVersion,
			gatedBy: null,
		});
	});
