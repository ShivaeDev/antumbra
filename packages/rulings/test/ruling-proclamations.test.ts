import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { asked, it, layer, seedFleet } from "#test/rulings-harness.ts";

const proclaimed = {
	answer: "survey a channel before dredging it",
	by: "admiral",
	choices: [],
	context: "two voyages dredged a channel nobody had surveyed",
	question: "may a voyage dredge a channel?",
	radius: "fleet",
	subjects: [],
	urgency: "eventual",
} as const;

const offered = {
	...proclaimed,
	choices: [{ label: "survey first" }, { label: "dredge freely" }],
} as const;

it.effectDB("a rule the admiral asks and answers stands at once", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const notices = yield* feeds.subscribeRulingRefresh();

			const ruling = yield* rulings.proclaim(proclaimed);

			expect(yield* PubSub.take(notices)).toBeUndefined();
			expect(ruling.requester).toEqual({ by: "admiral", kind: "authority" });
			expect(Option.getOrUndefined(ruling.answer)).toMatchObject({
				by: "admiral",
				text: proclaimed.answer,
			});
			expect(yield* rulings.open()).toEqual([]);
			expect((yield* rulings.standing([])).map((each) => each.id)).toEqual([
				ruling.id,
			]);
			// why: the asker and the answer are the same hand, so nobody is owed
			// the mail an agent's request would leave behind.
			expect(yield* rulings.awaitingDelivery()).toEqual([]);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("answers with the choice a proclamation named", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;

		const ruling = yield* rulings.proclaim({
			...offered,
			chosenChoice: "dredge freely",
		});

		const picked = ruling.choices.find(
			(choice) => choice.label === "dredge freely",
		);
		expect(Option.getOrThrow(ruling.answer).choiceId).toEqual(
			Option.some(picked?.id),
		);
	}).pipe(Effect.provide(layer));
});

// why: the pick names a label because no choice had an id yet, so a label
// matching none of them is refused exactly as an unknown id would be.
it.effectDB(
	"refuses a proclamation picking a choice it never offered",
	function* () {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;

			const failure = yield* Effect.flip(
				rulings.proclaim({ ...offered, chosenChoice: "dredge at night" }),
			);

			expect(failure).toMatchObject({
				_tag: "RulingChoiceUnknown",
				choiceId: "dredge at night",
			});
		}).pipe(Effect.provide(layer));
	},
);

// why: an authority may ask without answering; only proclaiming binds the two
// into one act, so a request it makes stays open like any other.
it.effectDB("keeps an authority's own request open until ruled", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;

		const ruling = yield* rulings.request({
			...asked,
			requester: { by: "admiral", kind: "authority" },
			rung: null,
		});

		expect(ruling.requester).toEqual({ by: "admiral", kind: "authority" });
		expect(Option.isNone(ruling.answer)).toBe(true);
		expect((yield* rulings.open()).map((each) => each.id)).toEqual([ruling.id]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a row naming an agent and an authority", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const ruling = yield* rulings.request(asked);

		yield* db.Ruling.where({ id: ruling.id }).update({
			requesterAuthority: "admiral",
		});

		expect(yield* Effect.flip(rulings.get(ruling.id))).toMatchObject({
			_tag: "StoredRulingValueInvalid",
			field: "requester",
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a row naming no requester at all", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const ruling = yield* rulings.request(asked);

		yield* db.Ruling.where({ id: ruling.id }).update({
			requesterAgentId: null,
		});

		expect(yield* Effect.flip(rulings.get(ruling.id))).toMatchObject({
			_tag: "StoredRulingValueInvalid",
			field: "requester",
		});
	}).pipe(Effect.provide(layer));
});
