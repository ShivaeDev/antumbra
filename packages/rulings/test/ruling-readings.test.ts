import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { asked, it, layer, pieceId, seedFleet, voyageId } from "#test/rulings-harness.ts";

it.effectDB("meets open rulings by urgency, then by radius", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const later = yield* rulings.request({
			...asked,
			radius: "fleet",
			urgency: "eventual",
		});
		const narrow = yield* rulings.request({
			...asked,
			radius: "piece",
			urgency: "blocking",
		});
		const middle = yield* rulings.request({
			...asked,
			radius: "fleet",
			urgency: "pressing",
		});
		const held = yield* rulings.request({
			...asked,
			radius: "fleet",
			urgency: "blocking",
		});

		expect((yield* rulings.open()).map((ruling) => ruling.id)).toEqual([held.id, narrow.id, middle.id, later.id]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("leaves a ruled ruling out of the open set", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const answered = yield* rulings.request(asked);
		const waiting = yield* rulings.request(asked);

		yield* rulings.rule({
			answer: "trust the soundings",
			by: "admiral",
			rulingId: answered.id,
		});

		expect((yield* rulings.open()).map((ruling) => ruling.id)).toEqual([waiting.id]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("reads standing rulings newest first", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const first = yield* rulings.request(asked);
		const second = yield* rulings.request(asked);
		yield* rulings.request(asked);

		yield* rulings.rule({
			answer: "trust the soundings",
			by: "admiral",
			rulingId: first.id,
		});
		yield* TestClock.adjust(1_000);
		yield* rulings.rule({
			answer: "trust the chart",
			by: "admiral",
			rulingId: second.id,
		});

		expect((yield* rulings.standing([])).map((ruling) => ruling.id)).toEqual([second.id, first.id]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("matches references exactly and tags by name", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const onVoyage = yield* rulings.request({
			...asked,
			subjects: [{ id: voyageId, kind: "voyage" }],
		});
		const onTag = yield* rulings.request({
			...asked,
			subjects: [{ kind: "tag", tag: "surveying" }],
		});
		yield* Effect.forEach([onVoyage, onTag], (ruling) =>
			rulings.rule({
				answer: "trust the soundings",
				by: "admiral",
				rulingId: ruling.id,
			}),
		);

		expect((yield* rulings.standing([{ id: voyageId, kind: "voyage" }])).map((ruling) => ruling.id)).toEqual([onVoyage.id]);
		expect((yield* rulings.standing([{ kind: "tag", tag: "surveying" }])).map((ruling) => ruling.id)).toEqual([onTag.id]);
		expect(yield* rulings.standing([{ id: pieceId, kind: "voyage" }])).toEqual([]);
		expect(yield* rulings.standing([{ kind: "tag", tag: "provisioning" }])).toEqual([]);
	}).pipe(Effect.provide(layer));
});
