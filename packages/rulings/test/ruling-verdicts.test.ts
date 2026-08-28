import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { asked, it, layer, seedFleet } from "#test/rulings-harness.ts";

const offered = {
	...asked,
	choices: [{ label: "trust the soundings" }, { label: "trust the chart" }],
} as const;

it.effectDB("records who ruled, when, and in what words", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(offered);
			const notices = yield* feeds.subscribeRulingRefresh();
			const picked = requested.choices[1];

			const ruled = yield* rulings.rule({
				answer: "the chart is older than the reef; resurvey it",
				by: "admiral",
				choiceId: picked?.id ?? "",
				rulingId: requested.id,
			});

			expect(yield* PubSub.take(notices)).toBeUndefined();
			const answer = Option.getOrThrow(ruled.answer);
			expect(answer.by).toBe("admiral");
			expect(answer.text).toBe("the chart is older than the reef; resurvey it");
			expect(answer.at).toBeInstanceOf(Date);
			expect(answer.choiceId).toEqual(Option.some(picked?.id));
			expect(yield* rulings.get(requested.id)).toEqual(ruled);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("keeps free words beside no pick at all", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(offered);

		const ruled = yield* rulings.rule({
			answer: "neither; sound it again",
			by: "admiral",
			rulingId: requested.id,
		});

		const answer = Option.getOrThrow(ruled.answer);
		expect(answer.text).toBe("neither; sound it again");
		expect(Option.isNone(answer.choiceId)).toBe(true);
		expect(ruled.choices).toHaveLength(2);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to rule a ruling that already stands", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(offered);
		yield* rulings.rule({
			answer: "trust the soundings",
			by: "admiral",
			rulingId: requested.id,
		});

		const failure = yield* Effect.flip(
			rulings.rule({
				answer: "on reflection, trust the chart",
				by: "admiral",
				rulingId: requested.id,
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingAlreadyRuled",
			rulingId: requested.id,
		});
		const standing = yield* rulings.get(requested.id);
		expect(Option.getOrThrow(standing.answer).text).toBe("trust the soundings");
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a choice offered on another ruling", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request(offered);
		const elsewhere = yield* rulings.request(offered);
		const stranger = elsewhere.choices[0];

		const failure = yield* Effect.flip(
			rulings.rule({
				answer: "trust that one",
				by: "admiral",
				choiceId: stranger?.id ?? "",
				rulingId: requested.id,
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingChoiceUnknown",
			choiceId: stranger?.id,
			rulingId: requested.id,
		});
		expect(Option.isNone((yield* rulings.get(requested.id)).answer)).toBe(true);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses to rule a ruling nothing asked", function* () {
	yield* Effect.gen(function* () {
		const rulings = yield* Rulings;

		const failure = yield* Effect.flip(
			rulings.rule({
				answer: "nothing to answer",
				by: "admiral",
				rulingId: "ruling-missing",
			}),
		);

		expect(failure).toMatchObject({
			_tag: "RulingNotFound",
			rulingId: "ruling-missing",
		});
	}).pipe(Effect.provide(layer));
});
