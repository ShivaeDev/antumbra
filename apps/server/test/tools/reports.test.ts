import { answered, it } from "@antumbra/app-testing/entry.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { ReportId } from "@antumbra/domain-reports/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { requestId } from "@antumbra/platform-tool-schemas/request.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { landReportTool } from "#tools/reports/land.ts";
import { readReportTool } from "#tools/reports/read.ts";

const reef = VoyageId.make("voyage:reef");
const soundings = PieceId.make("piece:soundings");
const reportId = ReportId.make("report:reef");
const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "the reef is uncharted",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
	requestId: Request.make(reef),
} as const;
const chartering = {
	charter: "sound the reef",
	dependsOn: [],
	expectation: "soundings land",
	requestId: Request.make(soundings),
	role: "hand",
	title: "Soundings",
	voyageId: reef,
};
const landing = {
	authorAgentId: "agent-surveyor",
	body: "The eastern shoal is steeper than charted.",
	pieceId: soundings,
	requestId: Request.make(reportId),
	title: "Reef soundings",
};

const context = { agentId: "agent-surveyor", sessionId: "session-surveyor", callId: reportId, pieceId: soundings, voyageId: reef };

it.app("the report tool lands on its bound Piece and the voyage reads the full report", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	const landedId = ReportId.make(requestId(context));

	expect(yield* landReportTool.invoke(context, { body: landing.body, title: landing.title })).toEqual({ ok: true, text: "report landed" });
	expect(yield* answered(app.api.reports.byId({ id: landedId }))).toMatchObject({
		authorAgentId: context.agentId,
		pieceIds: [soundings],
		body: landing.body,
	});
	expect(
		yield* readReportTool.invoke(
			{ agentId: context.agentId, sessionId: context.sessionId, callId: "read-report", voyageId: reef },
			{ reportId: landedId },
		),
	).toEqual({ ok: true, text: `# ${landing.title}\nreport by ${context.agentId}\n\n${landing.body}` });
});

it.app("a crew member reads sibling reports but cannot read reports outside its voyage", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.reports.land({ ...landing, authorAgentId: null });
	const sibling = PieceId.make("piece:sibling");
	yield* app.api.pieces.charter({ ...chartering, requestId: Request.make(sibling), title: "Sibling" });
	expect(yield* readReportTool.invoke({ ...context, pieceId: sibling }, { reportId })).toEqual({
		ok: true,
		text: `# ${landing.title}\nreport\n\n${landing.body}`,
	});
	const elsewhere = VoyageId.make("voyage:elsewhere");
	yield* app.api.voyages.open({ ...opening, requestId: Request.make(elsewhere) });
	expect(yield* readReportTool.invoke({ ...context, voyageId: elsewhere }, { reportId })).toEqual({
		ok: false,
		text: "no report with that id is on your voyage",
	});
	expect(yield* readReportTool.invoke(context, { reportId: ReportId.make("missing") })).toEqual({
		ok: false,
		text: "no report with that id is on your voyage",
	});
});

it.app("a report tool without a bound Piece refuses landing", function* (app) {
	const unassigned = { agentId: context.agentId, sessionId: context.sessionId, callId: context.callId };
	expect(yield* landReportTool.invoke(unassigned, { body: landing.body, title: landing.title })).toEqual({
		ok: false,
		text: "you are not on a piece",
	});
	expect(yield* answered(app.api.reports.byId({ id: reportId }))).toBeNull();
});
