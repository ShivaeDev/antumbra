import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { asked, it, layer, requesterId, seedFleet } from "#test/rulings-harness.ts";

it.effectDB("moves the rung one step and says who moved it", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(asked);
			const notices = yield* feeds.subscribeRulingRefresh();

			const climbed = yield* rulings.passUp({
				by: "captain",
				byAgentId: requesterId,
				note: "both repositories chart this shoal; the fleet must pick one",
				rulingId: requested.id,
			});

			expect(yield* PubSub.take(notices)).toBeUndefined();
			expect(climbed.rung).toEqual(Option.some("flagship"));
			expect(climbed.reclassifications).toEqual([
				{
					at: expect.any(Date),
					by: "captain",
					byAgentId: Option.some(requesterId),
					note: Option.some("both repositories chart this shoal; the fleet must pick one"),
					radius: Option.none(),
					urgency: Option.none(),
				},
			]);
			expect(yield* rulings.get(requested.id)).toEqual(climbed);
		}),
	).pipe(Effect.provide(layer));
});

// why: the axes belong to the asker and to whoever reclassifies them, so
// climbing moves the rung and leaves radius and urgency exactly as they were.
it.effectDB("leaves both axes where the asker declared them", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);

		const climbed = yield* rulings.passUp({
			by: "captain",
			note: "not mine to settle",
			rulingId: requested.id,
		});

		expect(climbed.radius).toBe("voyage");
		expect(climbed.urgency).toBe("pressing");
		expect(climbed.declared).toEqual({ radius: "voyage", urgency: "pressing" });
	}).pipe(Effect.provide(layer));
});

it.effectDB("climbs from the flagship to the admiral", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request({
			...asked,
			radius: "fleet",
			rung: "flagship",
		});

		const climbed = yield* rulings.passUp({
			by: "flagship",
			note: "this is the admiral's to settle",
			rulingId: requested.id,
		});

		expect(climbed.rung).toEqual(Option.some("admiral"));
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a rung the question does not wait on", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);

		const failure = yield* Effect.flip(
			rulings.passUp({
				by: "flagship",
				note: "sending it on",
				rulingId: requested.id,
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingNotAtRung",
			by: "flagship",
			rulingId: requested.id,
			rung: "captain",
		});
		expect(yield* db.RulingReclassification.all()).toEqual([]);
		expect((yield* rulings.get(requested.id)).rung).toEqual(Option.some("captain"));
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to move a ruling that already stands", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(asked);
		yield* rulings.rule({
			answer: "trust the soundings",
			by: "captain",
			rulingId: requested.id,
		});

		const failure = yield* Effect.flip(
			rulings.passUp({
				by: "captain",
				note: "on reflection this is wider",
				rulingId: requested.id,
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingAlreadyRuled",
			rulingId: requested.id,
		});
		expect(yield* db.RulingReclassification.all()).toEqual([]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to move a ruling nothing asked", function* () {
	yield* Effect.gen(function* () {
		const rulings = yield* Rulings;

		const failure = yield* Effect.flip(
			rulings.passUp({
				by: "captain",
				note: "sending it on",
				rulingId: "ruling-missing",
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingNotFound",
			rulingId: "ruling-missing",
		});
	}).pipe(Effect.provide(layer));
});
