import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { startRetried } from "#facts/start-retried.ts";
import { start } from "#rows/start.ts";
export const startRetriedMaterializer = materializer(startRetried, {
	writes: [start],
	run: Effect.fn("Starts.StartRetried")(function* (fact, rows) {
		yield* rows.start.update(fact.id, { status: "requested", operationRequestId: fact.requestId, detail: null });
	}),
});
