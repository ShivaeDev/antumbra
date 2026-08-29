import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { TestClock } from "effect/testing";
import { asked, it, layer, seedFleet } from "#test/rulings-harness.ts";

it.effectDB("appends each word beside the asker's declaration", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(asked);
			const notices = yield* feeds.subscribeRulingRefresh();

			yield* rulings.reclassify({
				by: "admiral",
				note: "the surveyor cannot move until this lands",
				rulingId: requested.id,
				urgency: "blocking",
			});
			yield* TestClock.adjust(1_000);
			const reclassified = yield* rulings.reclassify({
				by: "admiral",
				radius: "fleet",
				rulingId: requested.id,
			});

			expect(yield* PubSub.take(notices)).toBeUndefined();
			expect(reclassified.radius).toBe("fleet");
			expect(reclassified.urgency).toBe("blocking");
			expect(reclassified.declared).toEqual({
				radius: "voyage",
				urgency: "pressing",
			});
			expect(reclassified.reclassifications).toEqual([
				{
					at: expect.any(Date),
					by: "admiral",
					note: Option.some("the surveyor cannot move until this lands"),
					radius: Option.none(),
					urgency: Option.some("blocking"),
				},
				{
					at: expect.any(Date),
					by: "admiral",
					note: Option.none(),
					radius: Option.some("fleet"),
					urgency: Option.none(),
				},
			]);
			expect(yield* rulings.get(requested.id)).toEqual(reclassified);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("reads the latest word on each axis", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);

		yield* rulings.reclassify({
			by: "admiral",
			radius: "fleet",
			rulingId: requested.id,
			urgency: "blocking",
		});
		yield* TestClock.adjust(1_000);
		const reclassified = yield* rulings.reclassify({
			by: "admiral",
			rulingId: requested.id,
			urgency: "eventual",
		});

		expect(reclassified.radius).toBe("fleet");
		expect(reclassified.urgency).toBe("eventual");
		expect(reclassified.declared).toEqual({
			radius: "voyage",
			urgency: "pressing",
		});
	}).pipe(Effect.provide(layer));
});

// why: two words about one ruling can land in the same millisecond, and the
// effective axes are the last word on each — so the order is settled by the
// record rather than by whatever the database happened to hand back.
it.effectDB(
	"settles reclassifications that share a millisecond",
	function* (db) {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(asked);
			const at = new Date("2026-08-29T09:00:00.000Z");
			yield* db.RulingReclassification.create({
				at,
				by: "admiral",
				id: "reclassification-later",
				note: null,
				radius: "piece",
				rulingId: requested.id,
				urgency: null,
			});
			yield* db.RulingReclassification.create({
				at,
				by: "admiral",
				id: "reclassification-earlier",
				note: null,
				radius: "fleet",
				rulingId: requested.id,
				urgency: null,
			});

			const read = yield* rulings.get(requested.id);

			expect(read.reclassifications.map((row) => row.radius)).toEqual([
				Option.some("fleet"),
				Option.some("piece"),
			]);
			expect(read.radius).toBe("piece");
		}).pipe(Effect.provide(layer));
	},
);

it.effectDB("meets the open set in its reclassified order", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const someday = yield* rulings.request({ ...asked, urgency: "eventual" });
		const held = yield* rulings.request({ ...asked, urgency: "blocking" });
		expect((yield* rulings.open()).map((ruling) => ruling.id)).toEqual([
			held.id,
			someday.id,
		]);

		yield* rulings.reclassify({
			by: "admiral",
			rulingId: someday.id,
			urgency: "blocking",
		});
		yield* rulings.reclassify({
			by: "admiral",
			rulingId: held.id,
			urgency: "eventual",
		});

		expect((yield* rulings.open()).map((ruling) => ruling.id)).toEqual([
			someday.id,
			held.id,
		]);
	}).pipe(Effect.provide(layer));
});

// why: a ruled ruling is read in the light of the axes it was ruled under, so
// the standing set carries the reclassified radius and the declared one beside.
it.effectDB("stands at the radius it was ruled under", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);
		yield* rulings.reclassify({
			by: "admiral",
			radius: "fleet",
			rulingId: requested.id,
		});
		yield* rulings.rule({
			answer: "trust the soundings",
			by: "admiral",
			rulingId: requested.id,
		});

		const [standing] = yield* rulings.standing([]);

		expect(standing?.radius).toBe("fleet");
		expect(standing?.declared.radius).toBe("voyage");
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a reclassification naming no axis", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(asked);
			const notices = yield* feeds.subscribeRulingRefresh();

			const failure = yield* Effect.flip(
				rulings.reclassify({
					by: "admiral",
					note: "nothing to say",
					rulingId: requested.id,
				}),
			);

			expect(failure).toMatchObject({
				_tag: "RulingReclassificationEmpty",
				rulingId: requested.id,
			});
			expect(yield* db.RulingReclassification.all()).toEqual([]);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB(
	"refuses to reclassify a ruling that already stands",
	function* (db) {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(asked);
			yield* rulings.rule({
				answer: "trust the soundings",
				by: "admiral",
				rulingId: requested.id,
			});

			const failure = yield* Effect.flip(
				rulings.reclassify({
					by: "admiral",
					radius: "fleet",
					rulingId: requested.id,
				}),
			);

			expect(failure).toMatchObject({
				_tag: "RulingAlreadyRuled",
				rulingId: requested.id,
			});
			expect(yield* db.RulingReclassification.all()).toEqual([]);
		}).pipe(Effect.provide(layer));
	},
);

it.effectDB("refuses to reclassify a ruling nothing asked", function* () {
	yield* Effect.gen(function* () {
		const rulings = yield* Rulings;

		const failure = yield* Effect.flip(
			rulings.reclassify({
				by: "admiral",
				rulingId: "ruling-missing",
				urgency: "blocking",
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingNotFound",
			rulingId: "ruling-missing",
		});
	}).pipe(Effect.provide(layer));
});
