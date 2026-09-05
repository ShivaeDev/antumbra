import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";
import { asked, seedFleet } from "#test/rulings-harness.ts";

const climbing = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const awaiting = yield* rulings.awaitingAscent();
	return awaiting.map((ruling) => ruling.id);
});

it.effectApp("owes every open ask to the rung it waits on", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const first = yield* rulings.request({
		...asked,
		question: "may a voyage dredge what it has not surveyed?",
	});
	yield* TestClock.adjust(1_000);
	const second = yield* rulings.request({
		...asked,
		question: "and who signs off the survey?",
		radius: "fleet",
		rung: "flagship",
	});

	expect(yield* climbing).toEqual([first.id, second.id]);
});

it.effectApp("leaves a question waiting on the admiral alone", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	yield* rulings.request({ ...asked, radius: "fleet", rung: "admiral" });

	expect(yield* climbing).toEqual([]);
});

it.effectApp("stops owing an ask once it is ruled", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const open = yield* rulings.request(asked);

	yield* rulings.rule({
		answer: "survey first, always",
		by: "captain",
		rulingId: open.id,
	});

	expect(yield* climbing).toEqual([]);
});

it.effectApp("leaves a proclamation to the authority that wrote it", function* () {
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
});

it.effectApp("owes a passed-up question to the rung it reached", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const narrow = yield* rulings.request(asked);

	const climbed = yield* rulings.passUp({
		by: "captain",
		note: "the shoal is charted in two repositories, not one",
		rulingId: narrow.id,
	});

	expect(climbed.rung).toEqual(Option.some("flagship"));
	expect(yield* climbing).toEqual([narrow.id]);
});
