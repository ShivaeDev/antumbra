import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { TestClock } from "effect/testing";
import { asked, it, layer, requesterId, seedFleet } from "#test/rulings-harness.ts";

it.effectApp("appends each word beside the asker's declaration", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(asked);
			const notices = yield* feeds.subscribeRulingRefresh();

			yield* rulings.reclassify({
				by: "captain",
				byAgentId: requesterId,
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
					by: "captain",
					byAgentId: Option.some(requesterId),
					note: Option.some("the surveyor cannot move until this lands"),
					radius: Option.none(),
					urgency: Option.some("blocking"),
				},
				{
					at: expect.any(Date),
					by: "admiral",
					byAgentId: Option.none(),
					note: Option.none(),
					radius: Option.some("fleet"),
					urgency: Option.none(),
				},
			]);
			expect(yield* rulings.get(requested.id)).toEqual(reclassified);
		}),
	).pipe(Effect.provide(layer));
});

it.effectApp("reads the latest word on each axis", function* () {
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

it.effectApp("meets the open set in its reclassified order", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const someday = yield* rulings.request({ ...asked, urgency: "eventual" });
		const held = yield* rulings.request({ ...asked, urgency: "blocking" });
		expect((yield* rulings.open()).map((ruling) => ruling.id)).toEqual([held.id, someday.id]);

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

		expect((yield* rulings.open()).map((ruling) => ruling.id)).toEqual([someday.id, held.id]);
	}).pipe(Effect.provide(layer));
});

it.effectApp("stands at the radius it was ruled under", function* () {
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
