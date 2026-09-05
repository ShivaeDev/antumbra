import { Effect } from "effect";
import { announce, transitionRow } from "#transitions.ts";

export const retryIntent = Effect.fn("Kernel.retry")(function* (id: string) {
	const change = yield* transitionRow(id, "retry");
	yield* announce(change);
});
