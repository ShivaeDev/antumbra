import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";
import { asked, requesterId, seedFleet } from "#test/rulings-harness.ts";

it.effectApp("keeps everything said since the request beside the words it was asked with", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const requested = yield* rulings.request(asked);

	yield* rulings.addContext({ body: "which chart edition are you reading?", rulingId: requested.id });
	yield* TestClock.adjust(1_000);
	const extended = yield* rulings.addContext({
		authorAgentId: requesterId,
		body: "the 2019 edition",
		rulingId: requested.id,
	});

	expect(extended.context).toBe(asked.context);
	expect(extended.contexts).toEqual([
		{
			at: expect.any(Date),
			authorAgentId: Option.none(),
			body: "which chart edition are you reading?",
		},
		{
			at: expect.any(Date),
			authorAgentId: Option.some(requesterId),
			body: "the 2019 edition",
		},
	]);
	expect(yield* rulings.get(requested.id)).toEqual(extended);
});

it.effectApp("refuses to add context to a ruling that is already answered", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const requested = yield* rulings.request(asked);
	yield* rulings.rule({
		answer: "trust the soundings",
		by: "admiral",
		rulingId: requested.id,
	});

	const failure = yield* Effect.flip(rulings.addContext({ body: "one more thing", rulingId: requested.id }));

	expect(failure).toMatchObject({
		_tag: "RulingAlreadyRuled",
		rulingId: requested.id,
	});
});

it.effectApp("refuses to add context to a ruling nothing asked", function* () {
	const rulings = yield* Rulings;

	const failure = yield* Effect.flip(rulings.addContext({ body: "nothing to add to", rulingId: "ruling-missing" }));

	expect(failure).toMatchObject({
		_tag: "RulingNotFound",
		rulingId: "ruling-missing",
	});
});
