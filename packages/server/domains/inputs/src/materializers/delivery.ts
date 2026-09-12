import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { inputDeliveryChanged } from "#facts/delivery.ts";
import { sessionInput } from "#rows/input.ts";
export const changed = materializer(inputDeliveryChanged, {
	writes: [sessionInput],
	run: Effect.fn("inputs.InputDeliveryChanged")(function* (fact, rows) {
		yield* rows.sessionInput.update(fact.id, { status: fact.status, detail: fact.detail });
	}),
});
