import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import {
	asked,
	it,
	layer,
	pieceId,
	repoId,
	seedFleet,
	voyageId,
} from "#test/rulings-harness.ts";

it.effectDB("stores the choices a request offers in order", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;

		const ruling = yield* rulings.request({
			...asked,
			choices: [
				{ detail: "the soundings are fresher", label: "trust the soundings" },
				{ label: "trust the chart" },
			],
		});

		expect(
			ruling.choices.map((choice) => [
				choice.position,
				choice.label,
				choice.detail,
			]),
		).toEqual([
			[0, "trust the soundings", "the soundings are fresher"],
			[1, "trust the chart", null],
		]);
		expect(Option.isNone(ruling.answer)).toBe(true);
		expect(ruling.radius).toBe("voyage");
		expect(ruling.urgency).toBe("pressing");
		expect(yield* db.RulingChoice.all()).toHaveLength(2);
		expect(yield* rulings.get(ruling.id)).toEqual(ruling);
	}).pipe(Effect.provide(layer));
});

// why: a question waits on exactly one rung from the moment it is asked, so
// the ascent never has to guess who is owed it from the radius alone.
it.effectDB("stores the rung the asker's request waits on", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;

		const fromCrew = yield* rulings.request(asked);
		const fromCaptain = yield* rulings.request({ ...asked, rung: "flagship" });

		expect(fromCrew.rung).toEqual(Option.some("captain"));
		expect(fromCaptain.rung).toEqual(Option.some("flagship"));
		expect((yield* rulings.get(fromCrew.id)).rung).toEqual(
			Option.some("captain"),
		);
	}).pipe(Effect.provide(layer));
});

it.effectDB("stores every subject a request names", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;

		const ruling = yield* rulings.request({
			...asked,
			subjects: [
				{ id: voyageId, kind: "voyage" },
				{ id: pieceId, kind: "piece" },
				{ id: repoId, kind: "repo" },
				{ kind: "tag", tag: "surveying" },
			],
		});

		expect(ruling.subjects).toHaveLength(4);
		expect(ruling.subjects).toEqual(
			expect.arrayContaining([
				{ id: voyageId, kind: "voyage" },
				{ id: pieceId, kind: "piece" },
				{ id: repoId, kind: "repo" },
				{ kind: "tag", tag: "surveying" },
			]),
		);
		expect(yield* db.RulingSubject.all()).toHaveLength(4);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a request naming what the fleet lost", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const notices = yield* feeds.subscribeRulingRefresh();

			const failure = yield* Effect.flip(
				rulings.request({
					...asked,
					choices: [{ label: "trust the chart" }],
					subjects: [
						{ id: voyageId, kind: "voyage" },
						{ id: "piece-adrift", kind: "piece" },
					],
				}),
			);

			expect(failure).toMatchObject({
				_tag: "RulingSubjectMissing",
				subject: { id: "piece-adrift", kind: "piece" },
			});
			expect(yield* db.Ruling.all()).toEqual([]);
			expect(yield* db.RulingChoice.all()).toEqual([]);
			expect(yield* db.RulingSubject.all()).toEqual([]);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("announces a request once it is written", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const notices = yield* feeds.subscribeRulingRefresh();

			yield* rulings.request(asked);

			expect(yield* PubSub.take(notices)).toBeUndefined();
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("refuses to read a ruling nothing asked", function* () {
	yield* Effect.gen(function* () {
		const rulings = yield* Rulings;

		expect(yield* Effect.flip(rulings.get("ruling-missing"))).toMatchObject({
			_tag: "RulingNotFound",
			rulingId: "ruling-missing",
		});
	}).pipe(Effect.provide(layer));
});
