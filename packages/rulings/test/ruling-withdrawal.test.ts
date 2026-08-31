import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { TestClock } from "effect/testing";
import { asked, it, layer, seedFleet } from "#test/rulings-harness.ts";

const standingRuling = Effect.gen(function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const ruling = yield* rulings.request(asked);
	yield* rulings.rule({
		answer: "trust the soundings",
		by: "admiral",
		rulingId: ruling.id,
	});
	return { ruling, rulings };
});

it.effectDB("drops a withdrawn ruling from the standing set", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const { ruling, rulings } = yield* standingRuling;
			const feeds = yield* DomainFeeds;
			const notices = yield* feeds.subscribeRulingRefresh();

			const withdrawn = yield* rulings.withdraw({
				by: "admiral",
				note: "the shoal was dredged away",
				rulingId: ruling.id,
			});

			expect(yield* PubSub.take(notices)).toBeUndefined();
			expect(yield* rulings.standing([])).toEqual([]);
			const provenance = Option.getOrThrow(withdrawn.withdrawal);
			expect(provenance.by).toBe("admiral");
			expect(provenance.note).toBe("the shoal was dredged away");
			expect(provenance.at).toBeInstanceOf(Date);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("leaves a withdrawn ruling readable by id", function* () {
	yield* Effect.gen(function* () {
		const { ruling, rulings } = yield* standingRuling;

		const withdrawn = yield* rulings.withdraw({
			by: "admiral",
			note: "the shoal was dredged away",
			rulingId: ruling.id,
		});

		const read = yield* rulings.get(ruling.id);
		expect(read).toEqual(withdrawn);
		expect(read.question).toBe(asked.question);
		expect(Option.getOrThrow(read.answer).text).toBe("trust the soundings");
		expect(Option.isNone(read.supersession)).toBe(true);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to withdraw a ruling nothing asked", function* () {
	yield* Effect.gen(function* () {
		const { rulings } = yield* standingRuling;

		const failure = yield* Effect.flip(
			rulings.withdraw({
				by: "admiral",
				note: "nothing to retire",
				rulingId: "ruling-adrift",
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingNotFound",
			rulingId: "ruling-adrift",
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to withdraw a ruling nobody has ruled", function* () {
	yield* Effect.gen(function* () {
		const { rulings } = yield* standingRuling;
		const open = yield* rulings.request(asked);

		const failure = yield* Effect.flip(
			rulings.withdraw({
				by: "admiral",
				note: "the question went away",
				rulingId: open.id,
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingNotRuled",
			rulingId: open.id,
		});
		expect(Option.isNone((yield* rulings.get(open.id)).withdrawal)).toBe(true);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to withdraw a ruling a later one took over", function* () {
	yield* Effect.gen(function* () {
		const { ruling, rulings } = yield* standingRuling;
		yield* TestClock.adjust(1_000);
		const newer = yield* rulings.request(asked);
		yield* rulings.rule({
			answer: "trust the chart",
			by: "admiral",
			rulingId: newer.id,
		});
		yield* rulings.supersede({
			by: "admiral",
			byRulingId: newer.id,
			rulingId: ruling.id,
		});

		const failure = yield* Effect.flip(
			rulings.withdraw({
				by: "admiral",
				note: "the shoal was dredged away",
				rulingId: ruling.id,
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingAlreadySuperseded",
			byRulingId: newer.id,
			rulingId: ruling.id,
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("withdraws a ruling once and only once", function* () {
	yield* Effect.gen(function* () {
		const { ruling, rulings } = yield* standingRuling;
		yield* rulings.withdraw({
			by: "admiral",
			note: "the shoal was dredged away",
			rulingId: ruling.id,
		});

		const again = yield* Effect.flip(
			rulings.withdraw({
				by: "admiral",
				note: "and again",
				rulingId: ruling.id,
			}),
		);

		expect(again).toMatchObject({
			_tag: "RulingAlreadyWithdrawn",
			rulingId: ruling.id,
		});
		expect(Option.getOrThrow((yield* rulings.get(ruling.id)).withdrawal).note).toBe("the shoal was dredged away");
	}).pipe(Effect.provide(layer));
});
