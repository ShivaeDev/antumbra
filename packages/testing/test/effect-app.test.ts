import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Ref } from "effect";

it.effectApp(
	"opens a voyage on the dispatching kernel",
	function* ({ domain }) {
		const voyage = yield* domain.voyages.open({
			backend: "scripted",
			context: "the reef is uncharted",
			name: "Chart the reef",
			northStar: "every shoal is known",
		});
		expect(voyage.name).toBe("Chart the reef");
	},
);

it.effectApp(
	"retries a reading by advancing the test clock",
	function* ({ eventually }) {
		const ticks = yield* Ref.make(0);
		const ready = () =>
			Ref.updateAndGet(ticks, (count) => count + 1).pipe(
				Effect.flatMap((count) =>
					count >= 3 ? Effect.succeed(count) : Effect.fail("not yet"),
				),
			);
		expect(yield* eventually(ready)).toBe(3);
	},
);

it.effectApp(
	"sleeps when the tester is asked for a live clock",
	{ clock: "live" },
	function* ({ clock }) {
		yield* clock.adjust(1);
	},
);
