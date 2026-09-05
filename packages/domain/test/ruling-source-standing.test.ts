import { RulingSource } from "@antumbra/contract";
import { it } from "@antumbra/persistence/testing";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import { asked, layer, oneStanding, seedFleet, voyageId, watchUntil } from "#test/ruling-source-harness.ts";

it.effectDB("a supersession drops the older ruling from the standing feed", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const older = yield* rulings.request(asked);
		const newer = yield* rulings.request(asked);
		yield* source.rule({ answer: "trust the chart", rulingId: older.id });
		yield* source.rule({
			answer: "the soundings are fresher; plot against them",
			choiceId: newer.choices[0]?.id,
			rulingId: newer.id,
		});
		const watcher = yield* watchUntil(source.standingFeed, oneStanding);

		const receipt = yield* source.supersede({
			byRulingId: newer.id,
			rulingId: older.id,
		});

		expect(receipt).toEqual({ byRulingId: newer.id, rulingId: older.id });
		const seen = yield* Fiber.join(watcher);
		expect(seen[0]?.rulings).toEqual([
			{
				answer: "the soundings are fresher; plot against them",
				chosen: "trust the soundings",
				id: newer.id,
				question: asked.question,
				radius: "voyage",
				ruledAt: expect.any(String),
				ruledBy: "admiral",
				ruledByAgentId: null,
				stale: false,
				subjects: expect.arrayContaining([
					{ kind: "voyage", label: voyageId },
					{ kind: "tag", label: "surveying" },
				]),
				urgency: "blocking",
			},
		]);
		const superseded = yield* rulings.get(older.id);
		expect(Option.getOrUndefined(superseded.supersession)).toMatchObject({
			by: "admiral",
			byRulingId: newer.id,
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a supersession the record refuses, in its words", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const standing = yield* rulings.request(asked);
		const open = yield* rulings.request(asked);
		yield* source.rule({ answer: "trust the chart", rulingId: standing.id });

		const unruled = yield* Effect.flip(source.supersede({ byRulingId: open.id, rulingId: standing.id }));
		const itself = yield* Effect.flip(source.supersede({ byRulingId: standing.id, rulingId: standing.id }));
		const adrift = yield* Effect.flip(
			source.supersede({
				byRulingId: standing.id,
				rulingId: "ruling-adrift",
			}),
		);

		expect(unruled).toMatchObject({
			_tag: "RulingRefused",
			reason: `ruling ${open.id} has not been ruled`,
		});
		expect(itself).toMatchObject({
			_tag: "RulingRefused",
			reason: `ruling ${standing.id} cannot supersede itself`,
		});
		expect(adrift).toMatchObject({
			_tag: "RulingRefused",
			reason: "no ruling: ruling-adrift",
		});
	}).pipe(Effect.provide(layer));
});
