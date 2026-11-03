import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { captureJournal } from "@antumbra/app-testing/test-support/journal-replay.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { checkPostgresFixture } from "@antumbra/server-journal/postgres/fixture.ts";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef, request } from "#test/kit.ts";

postgresApp.it(
	"replays Piece facts, outcomes and working assignments from a captured journal",
	[],
	function* ({ api, journal, replayJournal, observeJournal, pieceHistory, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open(opening);
		yield* legacy.api.voyages.quiet({ id: reef });
		yield* legacy.api.pieces.charter(chartering("soundings"));
		yield* legacy.api.pieces.charter(chartering("charts", [pieceOf("soundings")]));
		yield* legacy.api.pieces.launch({ id: pieceOf("charts") });
		yield* legacy.api.agents.workNow({ pieceId: pieceOf("soundings") });
		yield* legacy.api.reports.land({ pieceId: pieceOf("soundings"), authorAgentId: null, title: "Survey", body: "The soundings are charted" });
		const snapshot = yield* replayJournal(legacy);
		const expected = snapshot.pieceSnapshot;
		const checked = yield* checkPostgresFixture(yield* captureJournal(legacy));
		expect(checked).toMatchObject({ voyages: snapshot.voyages.length, pieces: 2 });
		expect(expected.assignments).toEqual(expect.arrayContaining([expect.objectContaining({ pieceId: pieceOf("soundings"), working: true })]));
		expect(expected.outcomes).toEqual(expect.arrayContaining([expect.objectContaining({ sourceKind: "report", status: "landed" })]));
		expect(yield* api["pieces.all"]({})).toEqual(expected.pieces);
		expect(yield* api["pieces.progress"]({ id: pieceOf("soundings") })).toMatchObject({ state: "active", settledDone: true, concluded: false });
		expect(yield* api["pieces.progress"]({ id: pieceOf("charts") })).toMatchObject({ state: "ready", eligible: true });
		yield* legacy.api.pieces.rewire({ id: pieceOf("charts"), dependsOn: [] });
		yield* api["pieces.rewire"]({ id: pieceOf("charts"), dependsOn: [], requestId: request("rewire") });
		yield* observeJournal(legacy, request("latest-evidence"));
		const before = yield* api["pieces.displayByVoyage"]({ voyageId: reef });
		yield* rebuild();
		expect(yield* api["pieces.displayByVoyage"]({ voyageId: reef })).toEqual(before);
		expect(yield* pieceHistory.evidence()).toEqual({ outcomes: expected.outcomes, assignments: expected.assignments, gates: expected.gates });
		expect(yield* api["pieces.progress"]({ id: pieceOf("soundings") })).toEqual(
			yield* answered(legacy.api.pieces.progress({ id: pieceOf("soundings") }), "working journal progress"),
		);
	},
);

postgresApp.it(
	"records and clears captured ruling gates without changing launch demand",
	[],
	function* ({ api, journal, replayJournal, observeJournal, pieceHistory, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open(opening);
		yield* legacy.api.voyages.quiet({ id: reef });
		yield* legacy.api.pieces.charter(chartering("soundings"));
		const id = pieceOf("soundings");
		yield* legacy.api.pieces.launch({ id });
		yield* legacy.api.rulings.request({
			requestId: request("ruling"),
			requester: { kind: "authority", by: "admiral" },
			rung: "admiral",
			context: "The channel has shifted",
			question: "Which passage?",
			radius: "piece",
			urgency: "blocking",
			choices: [],
			subjects: [],
			gates: [id],
			recommendation: null,
		});
		const snapshot = yield* replayJournal(legacy);
		expect(snapshot.pieceSnapshot.gates).toHaveLength(1);
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "blocked", eligible: false });
		const history = yield* pieceHistory.read(id);
		yield* legacy.api.rulings.answer({
			requestId: request("ruling-answer"),
			rulingId: RulingId.make("ruling"),
			answer: "Take the northern passage",
			choiceId: null,
			by: "admiral",
			byAgentId: null,
		});
		yield* observeJournal(legacy, request("gate-cleared"));
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "ready", eligible: true });
		yield* rebuild();
		expect((yield* pieceHistory.read(id)).length).toBe(history.length + 1);
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "ready" });
		expect((yield* api["pieces.byId"]({ id }))?.launchedAt).toBe(snapshot.pieceSnapshot.pieces[0]?.launchedAt);
		yield* observeJournal(legacy, request("gate-confirmed"));
		expect(yield* api["pieces.progress"]({ id })).toEqual(yield* answered(legacy.api.pieces.progress({ id }), "current journal progress"));
	},
);
