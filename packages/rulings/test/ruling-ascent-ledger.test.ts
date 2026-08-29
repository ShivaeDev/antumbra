import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { TestClock } from "effect/testing";
import { asked, it, layer, seedFleet } from "#test/rulings-harness.ts";

const fleetAsk = { ...asked, radius: "fleet" } as const;

const climbing = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const awaiting = yield* rulings.awaitingAscent();
	return awaiting.map((ruling) => ruling.id);
});

it.effectDB("owes the fleet's authority every open fleet ask", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const first = yield* rulings.request({
			...fleetAsk,
			question: "may a voyage dredge what it has not surveyed?",
		});
		yield* TestClock.adjust(1_000);
		const second = yield* rulings.request({
			...fleetAsk,
			question: "and who signs off the survey?",
		});
		yield* rulings.request({
			...asked,
			question: "which reading do we trust?",
		});

		expect(yield* climbing).toEqual([first.id, second.id]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("stops owing an ask once it is ruled", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const open = yield* rulings.request(fleetAsk);

		yield* rulings.rule({
			answer: "survey first, always",
			by: "admiral",
			rulingId: open.id,
		});

		expect(yield* climbing).toEqual([]);
	}).pipe(Effect.provide(layer));
});

it.effectDB(
	"leaves a proclamation to the authority that wrote it",
	function* () {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;

			yield* rulings.proclaim({
				answer: "survey first, always",
				by: "admiral",
				choices: [],
				context: "two voyages dredged each other's soundings",
				question: "may a voyage dredge what it has not surveyed?",
				radius: "fleet",
				subjects: [],
				urgency: "eventual",
			});

			expect(yield* climbing).toEqual([]);
		}).pipe(Effect.provide(layer));
	},
);

it.effectDB(
	"climbs with a question a captain pushed up to the fleet",
	function* () {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;
			const narrow = yield* rulings.request(asked);
			expect(yield* climbing).toEqual([]);

			yield* rulings.reclassify({
				by: "admiral",
				radius: "fleet",
				rulingId: narrow.id,
			});

			expect(yield* climbing).toEqual([narrow.id]);
		}).pipe(Effect.provide(layer));
	},
);
