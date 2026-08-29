import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { TestClock } from "effect/testing";
import { asked, it, layer, seedFleet } from "#test/rulings-harness.ts";

const standingPair = Effect.gen(function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const older = yield* rulings.request(asked);
	const newer = yield* rulings.request(asked);
	yield* rulings.rule({
		answer: "trust the soundings",
		by: "admiral",
		rulingId: older.id,
	});
	yield* TestClock.adjust(1_000);
	yield* rulings.rule({
		answer: "trust the chart",
		by: "admiral",
		rulingId: newer.id,
	});
	return { newer, older, rulings };
});

it.effectDB("drops a superseded ruling from the standing set", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const { newer, older, rulings } = yield* standingPair;
			const feeds = yield* DomainFeeds;
			const notices = yield* feeds.subscribeRulingRefresh();

			const superseded = yield* rulings.supersede({
				by: "admiral",
				byRulingId: newer.id,
				rulingId: older.id,
			});

			expect(yield* PubSub.take(notices)).toBeUndefined();
			expect((yield* rulings.standing([])).map((ruling) => ruling.id)).toEqual([
				newer.id,
			]);
			const provenance = Option.getOrThrow(superseded.supersession);
			expect(provenance.by).toBe("admiral");
			expect(provenance.byRulingId).toBe(newer.id);
			expect(provenance.at).toBeInstanceOf(Date);
			expect(yield* rulings.get(older.id)).toEqual(superseded);
			expect(Option.getOrThrow(superseded.answer).text).toBe(
				"trust the soundings",
			);
			expect(Option.isNone((yield* rulings.get(newer.id)).supersession)).toBe(
				true,
			);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("refuses to supersede a ruling with itself", function* () {
	yield* Effect.gen(function* () {
		const { older, rulings } = yield* standingPair;

		const failure = yield* Effect.flip(
			rulings.supersede({
				by: "admiral",
				byRulingId: older.id,
				rulingId: older.id,
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingSupersedesItself",
			rulingId: older.id,
		});
		expect(yield* rulings.standing([])).toHaveLength(2);
	}).pipe(Effect.provide(layer));
});

it.effectDB(
	"refuses a ruling that has not been ruled on either side",
	function* () {
		yield* Effect.gen(function* () {
			const { newer, older, rulings } = yield* standingPair;
			const open = yield* rulings.request(asked);

			const unruledTarget = yield* Effect.flip(
				rulings.supersede({
					by: "admiral",
					byRulingId: newer.id,
					rulingId: open.id,
				}),
			);
			const unruledSuccessor = yield* Effect.flip(
				rulings.supersede({
					by: "admiral",
					byRulingId: open.id,
					rulingId: older.id,
				}),
			);

			expect(unruledTarget).toMatchObject({
				_tag: "RulingNotRuled",
				rulingId: open.id,
			});
			expect(unruledSuccessor).toMatchObject({
				_tag: "RulingNotRuled",
				rulingId: open.id,
			});
			expect(Option.isNone((yield* rulings.get(older.id)).supersession)).toBe(
				true,
			);
		}).pipe(Effect.provide(layer));
	},
);

it.effectDB("supersedes a ruling once and only once", function* () {
	yield* Effect.gen(function* () {
		const { newer, older, rulings } = yield* standingPair;
		const third = yield* rulings.request(asked);
		yield* rulings.rule({
			answer: "resurvey the shoal",
			by: "admiral",
			rulingId: third.id,
		});
		yield* rulings.supersede({
			by: "admiral",
			byRulingId: newer.id,
			rulingId: older.id,
		});

		const again = yield* Effect.flip(
			rulings.supersede({
				by: "admiral",
				byRulingId: third.id,
				rulingId: older.id,
			}),
		);

		expect(again).toMatchObject({
			_tag: "RulingAlreadySuperseded",
			byRulingId: newer.id,
			rulingId: older.id,
		});
		expect(
			Option.getOrThrow((yield* rulings.get(older.id)).supersession).byRulingId,
		).toBe(newer.id);
	}).pipe(Effect.provide(layer));
});

// why: a ruling that was itself taken over no longer speaks for its scope, so
// it cannot be the ruling a later reader is pointed at.
it.effectDB("refuses a successor that is itself superseded", function* () {
	yield* Effect.gen(function* () {
		const { newer, older, rulings } = yield* standingPair;
		const third = yield* rulings.request(asked);
		yield* rulings.rule({
			answer: "resurvey the shoal",
			by: "admiral",
			rulingId: third.id,
		});
		yield* rulings.supersede({
			by: "admiral",
			byRulingId: newer.id,
			rulingId: older.id,
		});

		const failure = yield* Effect.flip(
			rulings.supersede({
				by: "admiral",
				byRulingId: older.id,
				rulingId: third.id,
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingAlreadySuperseded",
			byRulingId: newer.id,
			rulingId: older.id,
		});
		expect((yield* rulings.standing([])).map((ruling) => ruling.id)).toEqual([
			third.id,
			newer.id,
		]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to supersede a ruling nothing asked", function* () {
	yield* Effect.gen(function* () {
		const { newer, rulings } = yield* standingPair;

		const missingTarget = yield* Effect.flip(
			rulings.supersede({
				by: "admiral",
				byRulingId: newer.id,
				rulingId: "ruling-missing",
			}),
		);
		const missingSuccessor = yield* Effect.flip(
			rulings.supersede({
				by: "admiral",
				byRulingId: "ruling-missing",
				rulingId: newer.id,
			}),
		);

		expect(missingTarget).toMatchObject({
			_tag: "RulingNotFound",
			rulingId: "ruling-missing",
		});
		expect(missingSuccessor).toMatchObject({
			_tag: "RulingNotFound",
			rulingId: "ruling-missing",
		});
	}).pipe(Effect.provide(layer));
});
