import { Effect } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";
import { afterFailure } from "#spawn-teardown/after-failure.ts";
import { isCancelling } from "#spawn-teardown/is-cancelling.ts";

export const cancellation = Effect.fn("SpawnTeardown.cancellation")(function* (payload: SpawnFields, intentId: string) {
	if (yield* isCancelling(intentId)) {
		yield* afterFailure(payload);
	}
});
