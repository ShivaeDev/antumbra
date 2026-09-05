import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { asked, it, layer, seedFleet } from "#test/rulings-harness.ts";

it.effectApp("leaves a request open and unanswered when it is left for later", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);

		const parked = yield* rulings.park({ note: "after the survey lands", rulingId: requested.id });

		expect(Option.getOrThrow(parked.parked)).toEqual({
			at: expect.any(Date),
			note: "after the survey lands",
		});
		expect(Option.isNone(parked.answer)).toBe(true);
		expect((yield* rulings.open()).map((ruling) => ruling.id)).toEqual([requested.id]);
	}).pipe(Effect.provide(layer));
});

it.effectApp("answers a request left for later and keeps the note of why it waited", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);
		yield* rulings.park({ note: "after the survey lands", rulingId: requested.id });

		const ruled = yield* rulings.rule({
			answer: "trust the soundings",
			by: "admiral",
			rulingId: requested.id,
		});

		expect(Option.getOrThrow(ruled.answer).text).toBe("trust the soundings");
		expect(Option.getOrThrow(ruled.parked).note).toBe("after the survey lands");
		expect(yield* rulings.open()).toEqual([]);
	}).pipe(Effect.provide(layer));
});

it.effectApp("refuses to leave the same request for later twice", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);
		yield* rulings.park({ note: "after the survey lands", rulingId: requested.id });

		const failure = yield* Effect.flip(rulings.park({ note: "still not now", rulingId: requested.id }));

		expect(failure).toMatchObject({
			_tag: "RulingAlreadyParked",
			rulingId: requested.id,
		});
		expect(Option.getOrThrow((yield* rulings.get(requested.id)).parked).note).toBe("after the survey lands");
	}).pipe(Effect.provide(layer));
});

it.effectApp("refuses to leave an answered request for later", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);
		yield* rulings.rule({
			answer: "trust the soundings",
			by: "admiral",
			rulingId: requested.id,
		});

		const failure = yield* Effect.flip(rulings.park({ note: "too late", rulingId: requested.id }));

		expect(failure).toMatchObject({
			_tag: "RulingAlreadyRuled",
			rulingId: requested.id,
		});
	}).pipe(Effect.provide(layer));
});
