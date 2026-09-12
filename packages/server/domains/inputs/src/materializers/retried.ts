import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { inputRetried } from "#facts/retried.ts";
import { sessionInput } from "#rows/input.ts";
export const retried = materializer(inputRetried, {
	writes: [sessionInput, sessionOperation],
	run: Effect.fn("inputs.InputRetried")(function* (fact, rows) {
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
		});
	}),
});
