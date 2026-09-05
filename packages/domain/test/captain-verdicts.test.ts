import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Option } from "effect";
import { ask, crewLadder, delivered, standing, unruled } from "#test/captain-verdict-fixtures.ts";
import { callTool } from "#test/harness.ts";

it.effectApp("a captain settles the question its own crew asked", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const asked = yield* ask("voyage", "captain");

	const outcome = yield* callTool(ladder.captain, "rule_on", {
		answer: "no voyage dredges a channel it did not survey first",
		choice: "resurvey",
		rulingId: asked.id,
	});

	expect(outcome).toEqual({
		ok: true,
		text: `ruling ${asked.id} ruled — it binds one voyage until the admiral supersedes it, and the answer reaches the asker as mail`,
	});
	const answer = Option.getOrThrow((yield* standing(asked.id)).answer);
	expect(answer.by).toBe("captain");
	expect(answer.byAgentId).toEqual(Option.some(ladder.captainAgentId));
	expect(answer.choiceId).toEqual(Option.some(asked.choices[0]?.id));
	yield* delivered(asked.id);
});

it.effectApp("free words stand on their own when no choice is named", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const asked = yield* ask("voyage", "captain");

	const outcome = yield* callTool(ladder.captain, "rule_on", {
		answer: "neither; sound it again",
		rulingId: asked.id,
	});

	expect(outcome.ok).toBe(true);
	const answer = Option.getOrThrow((yield* standing(asked.id)).answer);
	expect(Option.isNone(answer.choiceId)).toBe(true);
});

it.effectApp("a captain is refused a question that would bind the fleet", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const asked = yield* ask("fleet", "captain");

	const refusal = yield* callTool(ladder.captain, "rule_on", {
		answer: "dredge away",
		rulingId: asked.id,
	});

	expect(refusal).toEqual({
		ok: false,
		text: `ruling ${asked.id} would bind the whole fleet, wider than the captain may bind — pass_up carries it to the rung above with what you know`,
	});
	expect(unruled(yield* standing(asked.id))).toBe(true);
});

it.effectApp("a question a captain passes up becomes the flagship's", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const asked = yield* ask("fleet", "captain");

	const passed = yield* callTool(ladder.captain, "pass_up", {
		note: "both my hands sail under this rule; it is not one ship's",
		rulingId: asked.id,
	});
	const outcome = yield* callTool(ladder.flagship, "rule_on", {
		answer: "no voyage dredges a channel it did not survey first",
		rulingId: asked.id,
	});

	expect(passed).toEqual({
		ok: true,
		text: `ruling ${asked.id} passed up — it waits on the rung above you now, with your note beside the asker's own words`,
	});
	expect(outcome.ok).toBe(true);
	expect(Option.getOrThrow((yield* standing(asked.id)).answer).by).toBe("flagship");
});

it.effectApp("a question that climbed past a captain is no longer its own", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const asked = yield* ask("voyage", "captain");
	yield* callTool(ladder.captain, "pass_up", {
		note: "the other ship charts the same reef",
		rulingId: asked.id,
	});

	const refusal = yield* callTool(ladder.captain, "rule_on", {
		answer: "resurvey it",
		rulingId: asked.id,
	});

	expect(refusal).toEqual({
		ok: false,
		text: `ruling ${asked.id} waits on the flagship now — it climbed past you, and only the rung it waits on may settle it`,
	});
	expect(unruled(yield* standing(asked.id))).toBe(true);
});

it.effectApp("a pass-up with nothing to say is refused", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const asked = yield* ask("voyage", "captain");

	const refusal = yield* callTool(ladder.captain, "pass_up", {
		note: "   ",
		rulingId: asked.id,
	});

	expect(refusal).toEqual({
		ok: false,
		text: "pass_up: a question climbs with what you know, so say what you know",
	});
	expect((yield* standing(asked.id)).rung).toEqual(Option.some("captain"));
});

it.effectApp("a ruling that already stands is not answered twice", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const rulings = yield* Rulings;
	const asked = yield* ask("voyage", "captain");
	yield* rulings.rule({
		answer: "survey first, always",
		by: "admiral",
		rulingId: asked.id,
	});

	const refusal = yield* callTool(ladder.captain, "rule_on", {
		answer: "on reflection, dredge away",
		rulingId: asked.id,
	});

	expect(refusal).toEqual({
		ok: false,
		text: `ruling ${asked.id} was already ruled by the admiral — a ruling that stands is superseded, never answered twice`,
	});
});

it.effectApp("a choice the asker never offered is refused with what was", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const asked = yield* ask("voyage", "captain");

	const refusal = yield* callTool(ladder.captain, "rule_on", {
		answer: "dredge it",
		choice: "dredge anyway",
		rulingId: asked.id,
	});

	expect(refusal).toEqual({
		ok: false,
		text: `ruling ${asked.id} never offered the choice "dredge anyway" — it offered "resurvey", "trust the chart"`,
	});
	expect(unruled(yield* standing(asked.id))).toBe(true);
});

it.effectApp("a ruling the fleet has not got is refused, not invented", { clock: "live" }, function* ({ scripted }) {
	const ladder = yield* crewLadder(scripted);
	const refusal = yield* callTool(ladder.captain, "rule_on", {
		answer: "yes",
		rulingId: "ruling-adrift",
	});

	expect(refusal).toEqual({
		ok: false,
		text: "there is no ruling ruling-adrift — name it as your mail does",
	});
});
