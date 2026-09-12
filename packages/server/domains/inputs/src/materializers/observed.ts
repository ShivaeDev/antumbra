import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Option, Schema } from "effect";
import { inputObserved } from "#facts/observed.ts";
import { sessionInput } from "#rows/input.ts";

const inputId = Schema.decodeUnknownOption(SessionInputId);
export const observed = materializer(inputObserved, {
	writes: [sessionInput],
	run: Effect.fn("inputs.InputDeliveryObserved")(function* (fact, rows) {
		const id = inputId(fact.inputId);
		if (Option.isNone(id)) return;
		const held = yield* rows.sessionInput.find(id.value);
		if (Option.isSome(held) && held.value.sessionId === fact.sessionId)
			yield* rows.sessionInput.update(id.value, { status: fact.status, detail: fact.detail });
	}),
});
