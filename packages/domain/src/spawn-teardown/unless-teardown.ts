import { Cause, Effect } from "effect";
import type { SpawnFields } from "#spawn-fields.ts";
import { afterFailure } from "#spawn-teardown/after-failure.ts";
import { cancellation } from "#spawn-teardown/cancellation.ts";

export const unlessTeardown = Effect.fn("SpawnTeardown.unlessTeardown")(function* (
	payload: SpawnFields,
	intentId: string,
	cause: Cause.Cause<unknown>,
) {
	if (!Cause.hasInterruptsOnly(cause)) {
		yield* afterFailure(payload);
		return;
	}
	yield* cancellation(payload, intentId);
});
