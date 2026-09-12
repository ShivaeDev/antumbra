import { it } from "@effect/vitest";
import { Effect, Latch } from "effect";
import { layer, Reactivity } from "effect/unstable/reactivity/Reactivity";
import { expect } from "vitest";
import { watching } from "#testing/watch.ts";

it.effect("waits for delivery of the current reading", () =>
	Effect.gen(function* () {
		const reactivity = yield* Reactivity;
		const watch = watching(reactivity, ["counts"]);
		yield* Effect.addFinalizer(() => Effect.sync(watch.cancel));
		const first = yield* watch.around(Effect.succeed(4));
		const settled = yield* Latch.make(false);
		yield* Effect.forkChild(Effect.andThen(watch.settled, settled.open), { startImmediately: true });
		expect(Latch.isOpen(settled)).toBe(false);

		yield* reactivity.invalidate(["counts"]);
		const latest = yield* watch.around(Effect.succeed(9));
		watch.delivered(first.generation);
		expect(Latch.isOpen(settled)).toBe(false);

		watch.delivered(latest.generation);
		yield* settled.await;
	}).pipe(Effect.provide(layer)),
);
