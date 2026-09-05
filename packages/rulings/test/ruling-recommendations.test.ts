import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { asked, seedFleet } from "#test/rulings-harness.ts";

const recommended = {
	...asked,
	choices: [{ label: "trust the soundings" }, { label: "trust the chart" }],
	recommendation: { choice: "trust the chart", reasoning: "the chart was surveyed at slack water" },
} as const;

it.effectApp("marks the offered choice the asker would take and keeps its reasoning", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;

	const ruling = yield* rulings.request(recommended);

	const chart = ruling.choices.find((choice) => choice.label === "trust the chart");
	expect(ruling.recommendation).toEqual(Option.some({ choiceId: chart?.id, reasoning: "the chart was surveyed at slack water" }));
	expect(ruling.choices.map((choice) => choice.label)).toEqual(["trust the soundings", "trust the chart"]);
	expect(yield* rulings.get(ruling.id)).toEqual(ruling);
});

it.effectApp("offers the recommended answer as the only choice when the asker offered none", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;

	const ruling = yield* rulings.request({ ...asked, recommendation: { choice: "resurvey the shoal", reasoning: "both readings are stale" } });

	expect(ruling.choices.map((choice) => [choice.position, choice.label])).toEqual([[0, "resurvey the shoal"]]);
	expect(ruling.recommendation).toEqual(Option.some({ choiceId: ruling.choices[0]?.id, reasoning: "both readings are stale" }));
});

it.effectApp("refuses a recommendation the asker never offered and stores nothing", function* ({ db }) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const notices = yield* feeds.subscribeRulingRefresh();

			const failure = yield* Effect.flip(
				rulings.request({ ...recommended, recommendation: { choice: "anchor overnight", reasoning: "the tide turns at dusk" } }),
			);

			expect(failure).toMatchObject({
				_tag: "RulingRecommendationMissing",
				choice: "anchor overnight",
				offered: ["trust the soundings", "trust the chart"],
			});
			expect(yield* db.Ruling.all()).toEqual([]);
			expect(yield* db.RulingChoice.all()).toEqual([]);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
		}),
	);
});

it.effectApp("a request without a recommendation reads as carrying none", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;

	const ruling = yield* rulings.request(asked);

	expect(Option.isNone(ruling.recommendation)).toBe(true);
});
