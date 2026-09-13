import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { it } from "@effect/vitest";
import { Cause, Effect, Stream } from "effect";
import { expect } from "vitest";

const said = (effect: Effect.Effect<unknown>): Effect.Effect<string> =>
	effect.pipe(
		Effect.catchCause((cause) => Effect.succeed(Cause.pretty(cause))),
		Effect.map(String),
	);

const answering: Stream.Stream<{ readonly status: string }> = Stream.concat(Stream.make({ status: "requested" }), Stream.never);

it.live("fails by name when nothing answers within the bound", () =>
	Effect.gen(function* () {
		const [silent, unmatched] = yield* Effect.all(
			[
				said(answered(Stream.never, "the birth to be recorded")),
				said(eventually(answering, (row) => row.status === "admitted", "the birth to be admitted")),
			],
			{ concurrency: 2 },
		);
		expect(silent).toContain("Timed out after 5 seconds waiting for the birth to be recorded");
		expect(silent).toContain("nothing was seen");
		expect(unmatched).toContain("Timed out after 5 seconds waiting for the birth to be admitted");
		expect(unmatched).toContain(`last saw {"status":"requested"}`);
	}),
);
