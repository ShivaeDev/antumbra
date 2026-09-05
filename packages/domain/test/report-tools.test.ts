import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { callTool, type ScriptedBackend, sessionFor } from "#test/harness.ts";
import { chain, eventually, openReefVoyage, terminalIntent } from "#test/voyage-fixtures.ts";

const OUT_OF_REACH = "no report with that id is on your voyage";
const BODY = "the eastern shoal is steeper than charted";

const landedOn = (pieceId: string, title: string) =>
	Effect.gen(function* () {
		const reports = yield* Reports;
		return yield* reports.land({ body: BODY, pieceId, title });
	});

const reportOnAnotherVoyage = Effect.gen(function* () {
	const pieces = yield* Pieces;
	const voyageRecords = yield* Voyages;
	const shoals = yield* voyageRecords.open({
		backend: "scripted",
		context: "the shoals are unnamed",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});
	const piece = yield* pieces.charter({
		charter: "name the northern shoal",
		dependsOn: [],
		expectation: "the shoal is named",
		role: "hand",
		title: "northern",
		voyageId: shoals.id,
	});
	return yield* landedOn(piece.id, "naming");
});

const crewOn = (scripted: ScriptedBackend, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.PieceAgent.where({ pieceId }).all())[0];
		return row === undefined ? yield* Effect.fail("no crew yet") : yield* sessionFor(scripted, row.agentId);
	});

const seedCaptain = Effect.fnUntraced(function* (scripted: ScriptedBackend) {
	const pieces = yield* Pieces;
	const domain = yield* AgentDomain;
	const voyage = yield* openReefVoyage;
	const piece = yield* pieces.charter({
		charter: "sound the eastern shoal",
		dependsOn: [],
		expectation: "soundings land",
		role: "hand",
		title: "alpha",
		voyageId: voyage.id,
	});
	const report = yield* landedOn(piece.id, "soundings");
	const hailed = yield* domain.voyages.hail(voyage.id);
	expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
	const captain = yield* sessionFor(scripted, hailed.agentId);
	return { captain, report };
});

it.effectApp("a captain reads a report its voyage landed, by the id it is shown", function* ({ scripted }) {
	const { captain, report } = yield* seedCaptain(scripted);
	const read = yield* callTool(captain, "read_voyage", {});
	expect(read.text).toContain(`- ${report.id} soundings — report`);

	const outcome = yield* callTool(captain, "read_report", {
		reportId: report.id,
	});
	expect(outcome).toEqual({
		ok: true,
		text: `# soundings\nreport\n\n${BODY}`,
	});
});

it.effectApp("a report landed on another voyage is refused, never served", function* ({ scripted }) {
	const { captain } = yield* seedCaptain(scripted);
	const elsewhere = yield* reportOnAnotherVoyage;
	expect(yield* callTool(captain, "read_report", { reportId: elsewhere.id })).toEqual({ ok: false, text: OUT_OF_REACH });
});

it.effectApp("an id nobody landed refuses exactly as a stranger's report does", function* ({ scripted }) {
	const { captain } = yield* seedCaptain(scripted);
	expect(yield* callTool(captain, "read_report", { reportId: "no-such-report" })).toEqual({ ok: false, text: OUT_OF_REACH });
});

it.effectApp("crew read a sibling piece's report and nothing across a hull", { clock: "live" }, function* ({ scripted }) {
	const { alpha, bravo } = yield* chain;
	const sibling = yield* landedOn(alpha.id, "soundings");
	const elsewhere = yield* reportOnAnotherVoyage;
	const crew = yield* eventually(crewOn(scripted, bravo.id));

	expect(yield* callTool(crew, "read_report", { reportId: sibling.id })).toEqual({ ok: true, text: `# soundings\nreport\n\n${BODY}` });
	expect(yield* callTool(crew, "read_report", { reportId: elsewhere.id })).toEqual({ ok: false, text: OUT_OF_REACH });
});
