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

const counting: Stream.Stream<{ readonly spent: bigint }> = Stream.concat(Stream.make({ spent: 12n }), Stream.never);

it.live("fails by name when nothing answers within the bound", () =>
	Effect.gen(function* () {
		const [silent, unmatched, unserializable] = yield* Effect.all(
			[
				said(answered(Stream.never, "the birth to be recorded")),
				said(eventually(answering, (row) => row.status === "admitted", "the birth to be admitted")),
				said(eventually(counting, (row) => row.spent > 20n, "the spend to pass twenty")),
			],
			{ concurrency: 3 },
		);
		expect(silent).toContain("Timed out after 5 seconds waiting for the birth to be recorded");
		expect(silent).toContain("nothing was seen");
		expect(unmatched).toContain("Timed out after 5 seconds waiting for the birth to be admitted");
		expect(unmatched).toContain(`last saw {"status":"requested"}`);
		expect(unserializable).toContain("Timed out after 5 seconds waiting for the spend to pass twenty");
		expect(unserializable).toContain(`last saw {"spent":"12n"}`);
	}),
);
