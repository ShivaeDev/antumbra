import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { birthRetried } from "#facts/birth-retried.ts";
import { birth } from "#rows/birth.ts";
export const birthRetriedMaterializer = materializer(birthRetried, {
	writes: [birth],
	run: Effect.fn("Agents.BirthRetried")(function* (fact, rows) {
		yield* rows.birth.update(fact.id, { status: "requested", operationRequestId: fact.requestId, detail: null });
	}),
});
