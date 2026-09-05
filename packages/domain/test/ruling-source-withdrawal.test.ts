import { RulingSource } from "@antumbra/contract";
import { it } from "@antumbra/persistence/testing";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import { asked, layer, seedFleet, watchUntil } from "#test/ruling-source-harness.ts";

const nothingStanding = (view: { readonly rulings: ReadonlyArray<unknown> }) => view.rulings.length === 0;

it.effectDB("a withdrawal drops the ruling from the standing feed", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const ruling = yield* rulings.request(asked);
		yield* source.rule({ answer: "trust the chart", rulingId: ruling.id });
		const watcher = yield* watchUntil(source.standingFeed, nothingStanding);

		const receipt = yield* source.withdraw({
			note: "the shoal was dredged away",
			rulingId: ruling.id,
		});

		expect(receipt).toEqual({ rulingId: ruling.id });
		const seen = yield* Fiber.join(watcher);
		expect(seen[0]?.rulings).toEqual([]);
		const withdrawn = yield* rulings.get(ruling.id);
		expect(Option.getOrUndefined(withdrawn.withdrawal)).toMatchObject({
			by: "admiral",
			note: "the shoal was dredged away",
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a withdrawal the record refuses, in its words", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const standing = yield* rulings.request(asked);
		const open = yield* rulings.request(asked);
		yield* source.rule({ answer: "trust the chart", rulingId: standing.id });
		yield* source.withdraw({
			note: "the shoal moved",
			rulingId: standing.id,
		});

		const unruled = yield* Effect.flip(source.withdraw({ note: "never mind", rulingId: open.id }));
		const again = yield* Effect.flip(source.withdraw({ note: "once more", rulingId: standing.id }));
		const adrift = yield* Effect.flip(source.withdraw({ note: "no such rule", rulingId: "ruling-adrift" }));

		expect(unruled).toMatchObject({
			_tag: "RulingRefused",
			reason: `ruling ${open.id} has not been ruled`,
		});
		expect(again).toMatchObject({
			_tag: "RulingRefused",
			reason: `ruling ${standing.id} was already withdrawn`,
		});
		expect(adrift).toMatchObject({
			_tag: "RulingRefused",
			reason: "no ruling: ruling-adrift",
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to supersede with a withdrawn ruling", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const older = yield* rulings.request(asked);
		const retired = yield* rulings.request(asked);
		yield* source.rule({ answer: "trust the chart", rulingId: older.id });
		yield* source.rule({ answer: "trust the soundings", rulingId: retired.id });
		yield* source.withdraw({ note: "the shoal moved", rulingId: retired.id });

		const refused = yield* Effect.flip(source.supersede({ byRulingId: retired.id, rulingId: older.id }));

		expect(refused).toMatchObject({
			_tag: "RulingRefused",
			reason: `ruling ${retired.id} was already withdrawn`,
		});
	}).pipe(Effect.provide(layer));
});
