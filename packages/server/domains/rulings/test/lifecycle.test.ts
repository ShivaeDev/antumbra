import { answered, it } from "@antumbra/app-testing/entry.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Option } from "effect";
import { expect } from "vitest";
import { RulingId } from "#ids.ts";

const asked = (name: string) =>
	({
		requestId: Id.Request.make(name),
		requester: { kind: "authority", by: "admiral" },
		rung: "admiral",
		context: "The channel has shifted",
		question: "Which passage?",
		radius: "piece",
		urgency: "blocking",
		choices: [],
		subjects: [],
		gates: [],
		recommendation: null,
	}) as const;
const ruled = (name: string) =>
	({
		requestId: Id.Request.make(`answer:${name}`),
		rulingId: RulingId.make(name),
		answer: "Take the northern passage",
		choiceId: null,
		by: "admiral",
		byAgentId: null,
	}) as const;
const opening = {
	requestId: Id.Request.make("voyage"),
	name: "Reef",
	context: "Sound the reef",
	northStar: "Safe passage",
	kind: "voyage",
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
} as const;
const chartering = {
	requestId: Id.Request.make("piece"),
	voyageId: VoyageId.make("voyage"),
	title: "Sound",
	charter: "Sound the passage",
	expectation: "Chart",
	role: "hand",
	dependsOn: [],
} as const;

it.app("answers an offered choice and retains its question, context and recommendation", function* (app) {
	yield* app.api.rulings.request({
		...asked("choice"),
		choices: [{ label: "North" }, { label: "South" }],
		recommendation: { choice: "North", reasoning: "It is deeper" },
	});
	const requested = Option.getOrThrow(yield* answered(app.api.rulings.byId({ id: RulingId.make("choice") })));
	const recommended = requested.recommendation?.choiceId;
	expect(recommended).toBe(requested.choices[0]?.id);
	yield* app.api.rulings.answer({ ...ruled("choice"), choiceId: recommended ?? null });
	expect(yield* answered(app.api.rulings.open({}))).toEqual([]);
	expect(yield* answered(app.api.rulings.standing({ subjects: [] }))).toMatchObject([
		{ question: "Which passage?", context: "The channel has shifted", answer: { text: "Take the northern passage", choiceId: recommended } },
	]);
});

it.app("refuses an answer below the rung and an unknown choice without settling the question", function* (app) {
	yield* app.api.rulings.request(asked("authority"));
	expect(yield* Effect.flip(app.api.rulings.answer({ ...ruled("authority"), by: "captain" }))).toMatchObject({ _tag: "BelowRung" });
	expect(
		yield* Effect.flip(app.api.rulings.answer({ ...ruled("authority"), requestId: Id.Request.make("bad-choice"), choiceId: "elsewhere" })),
	).toMatchObject({ _tag: "ChoiceUnknown" });
	expect((yield* answered(app.api.rulings.open({}))).map((ruling) => ruling.id)).toEqual(["authority"]);
});

it.app("keeps explicit piece gates when parked and releases them only when ruled", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.rulings.request({ ...asked("gate"), gates: [PieceId.make("piece")] });
	yield* app.api.rulings.park({ requestId: Id.Request.make("park"), rulingId: RulingId.make("gate"), note: "Wait for the tide" });
	expect(yield* app.rows.pieceRulingGate.count({ pieceId: PieceId.make("piece") })).toBe(1);
	yield* app.api.rulings.answer(ruled("gate"));
	expect(yield* app.rows.pieceRulingGate.count({ pieceId: PieceId.make("piece") })).toBe(0);
	const record = Option.getOrThrow(yield* answered(app.api.rulings.byId({ id: RulingId.make("gate") })));
	expect(record.parked?.note).toBe("Wait for the tide");
});

it.app("uses the final radius for standing reach and retains reclassification history", function* (app) {
	yield* app.api.rulings.request({ ...asked("reach"), radius: "fleet" });
	yield* app.api.rulings.reclassify({
		requestId: Id.Request.make("narrow"),
		rulingId: RulingId.make("reach"),
		by: "admiral",
		byAgentId: null,
		radius: "piece",
		urgency: null,
		note: "Local question",
	});
	yield* app.api.rulings.answer(ruled("reach"));
	expect(yield* answered(app.api.rulings.binding({ subjects: [] }))).toEqual([]);
	const record = Option.getOrThrow(yield* answered(app.api.rulings.byId({ id: RulingId.make("reach") })));
	expect(record).toMatchObject({ declaredRadius: "fleet", radius: "piece", reclassifications: [{ note: "Local question" }] });
});

it.app("keeps retired ruling history and its repository reference", function* (app) {
	yield* app.api.repos.register({ requestId: Id.Request.make("repo"), source: "https://example.com/fleet.git", defaultRef: "main" });
	yield* app.api.rulings.request({ ...asked("history"), subjects: [{ kind: "repo", id: RepoId.make("repo") }] });
	yield* app.api.rulings.answer(ruled("history"));
	yield* app.api.rulings.withdraw({
		requestId: Id.Request.make("withdraw"),
		rulingId: RulingId.make("history"),
		by: "admiral",
		note: "The passage moved",
	});
	expect(yield* answered(app.api.rulings.standing({ subjects: [] }))).toEqual([]);
	expect(yield* Effect.flip(app.api.repos.forget({ requestId: Id.Request.make("forget"), id: RepoId.make("repo") }))).toMatchObject({
		_tag: "Referenced",
	});
	expect(Option.getOrThrow(yield* answered(app.api.rulings.byId({ id: RulingId.make("history") }))).answer?.text).toBe("Take the northern passage");
});
