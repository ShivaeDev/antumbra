import { Effect, Fiber, Ref } from "effect";
import { SchedulerState } from "#state.ts";
import { announce, transitionRow } from "#transitions.ts";

export const cancelIntent = Effect.fn("Kernel.cancel")(function* (id: string) {
	const change = yield* transitionRow(id, "cancel");
	yield* announce(change);
	if (change.status === "cancelling") {
		const { running } = yield* SchedulerState;
		const fiber = (yield* Ref.get(running)).get(id);
		if (fiber !== undefined) {
			yield* Fiber.interrupt(fiber);
		}
	}
});
