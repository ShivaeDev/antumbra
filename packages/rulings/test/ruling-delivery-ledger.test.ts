import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { Rulings, RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";
import { asked, seedFleet } from "#test/rulings-harness.ts";

const ruledIn = (order: string) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const requested = yield* rulings.request({ ...asked, question: order });
		yield* rulings.rule({
			answer: `answered ${order}`,
			by: "admiral",
			rulingId: requested.id,
		});
		return requested.id;
	});

it.effectDB("owes delivery on every answer, oldest ruled first", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const first = yield* ruledIn("first");
		yield* TestClock.adjust(1_000);
		const second = yield* ruledIn("second");
		yield* rulings.request({ ...asked, question: "still open" });

		const awaiting = yield* rulings.awaitingDelivery();

		expect(awaiting.map((ruling) => ruling.id)).toEqual([first, second]);
	}).pipe(Effect.provide(RulingsLive.pipe(Layer.provide(DomainFeedsLive))));
});

it.effectDB("stops owing an answer once it is marked", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const first = yield* ruledIn("first");
		yield* TestClock.adjust(1_000);
		const second = yield* ruledIn("second");

		yield* rulings.markDelivered(first);

		expect((yield* rulings.awaitingDelivery()).map((ruling) => ruling.id)).toEqual([second]);
		const row = Option.getOrThrow(yield* db.Ruling.where({ id: first }).first());
		expect(row.deliveredAt).toBeInstanceOf(Date);
	}).pipe(Effect.provide(RulingsLive.pipe(Layer.provide(DomainFeedsLive))));
});

it.effectDB("refuses to mark a ruling nothing asked", function* () {
	yield* Effect.gen(function* () {
		const rulings = yield* Rulings;

		expect(yield* Effect.flip(rulings.markDelivered("ruling-missing"))).toMatchObject({ _tag: "RulingNotFound", rulingId: "ruling-missing" });
	}).pipe(Effect.provide(RulingsLive.pipe(Layer.provide(DomainFeedsLive))));
});
