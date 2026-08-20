import type { WriteExecutors } from "@antumbra/persistence";
import { Effect } from "effect";

export type WriteProvider = <A, E>(
	effect: Effect.Effect<A, E, WriteExecutors>,
) => Effect.Effect<A, E>;

// why: the Sight layer is built once against one set of write executors, and
// every read it answers and every submit it makes runs against those same
// ones — captured here so each part of the layer does not reach for the
// context itself and risk being built against a different set.
export const writeProvider = Effect.gen(function* () {
	const executors = yield* Effect.context<WriteExecutors>();
	const provide: WriteProvider = (effect) =>
		Effect.provideContext(effect, executors);
	return provide;
});
