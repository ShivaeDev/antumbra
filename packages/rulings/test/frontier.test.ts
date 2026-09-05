import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { TestClock } from "effect/testing";
import { asked, seedFleet, voyageId } from "#test/rulings-harness.ts";

it.effectApp("reads the voyage's agent questions in effective open order", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const request = {
		...asked,
		subjects: [
			{ kind: "voyage", id: voyageId },
			{ kind: "tag", tag: "survey" },
		],
	} as const;
	const promoted = yield* rulings.request(request);
	const lowered = yield* rulings.request({ ...request, urgency: "blocking" });
	const parked = yield* rulings.request({ ...request, urgency: "blocking" });
	yield* rulings.park({ rulingId: parked.id, note: "after the survey" });
	yield* rulings.addContext({ rulingId: promoted.id, body: "first sounding" });
	yield* TestClock.adjust(1_000);
	yield* rulings.addContext({ rulingId: promoted.id, body: "second sounding" });
	yield* rulings.request({ ...request, requester: { kind: "authority", by: "admiral" }, rung: null });
	yield* rulings.request({ ...asked, urgency: "blocking" });
	const answered = yield* rulings.request(request);
	yield* rulings.rule({ answer: "proceed", by: "admiral", rulingId: answered.id });
	yield* rulings.reclassify({ by: "admiral", rulingId: promoted.id, urgency: "blocking" });
	yield* rulings.reclassify({ by: "admiral", rulingId: lowered.id, urgency: "pressing" });
	yield* TestClock.adjust(1_000);
	yield* rulings.reclassify({ by: "admiral", rulingId: promoted.id, radius: "fleet" });
	const frontier = yield* rulings.frontier(voyageId);
	expect(frontier.map((ruling) => [ruling.id, ruling.urgency])).toEqual([
		[promoted.id, "blocking"],
		[lowered.id, "pressing"],
	]);
	expect(frontier.find((ruling) => ruling.id === promoted.id)?.contexts.map((context) => context.body)).toEqual([
		"first sounding",
		"second sounding",
	]);
	expect((yield* rulings.open()).some((ruling) => ruling.id === parked.id)).toBe(true);
	expect(yield* rulings.frontier("another-voyage")).toEqual([]);
});
