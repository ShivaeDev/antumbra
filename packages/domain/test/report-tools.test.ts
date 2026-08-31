import { Database } from "@antumbra/persistence";
import type { ReportRow } from "@antumbra/reports";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { dispatchingLayer, domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, callTool, makeScriptedBackend, type ScriptedBackend, type ScriptedSession, sessionFor } from "#test/harness.ts";
import { chain, eventually, openReefVoyage, PATIENCE } from "#test/voyage-fixtures.ts";

const OUT_OF_REACH = "no report with that id is on your voyage";
const BODY = "the eastern shoal is steeper than charted";

const landedOn = (pieceId: string, title: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.voyages.landReport({ body: BODY, pieceId, title });
	});

const reportOnAnotherVoyage = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const shoals = yield* domain.voyages.open({
		backend: "scripted",
		context: "the shoals are unnamed",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});
	const piece = yield* domain.voyages.charterPiece({
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

const withCaptain = <A, E>(body: (captain: ScriptedSession, report: ReportRow) => Effect.Effect<A, E, AgentDomain>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const piece = yield* domain.voyages.charterPiece({
				charter: "sound the eastern shoal",
				dependsOn: [],
				expectation: "soundings land",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			const report = yield* landedOn(piece.id, "soundings");
			const hailed = yield* domain.voyages.hail(voyage.id);
			const captain = yield* eventually(sessionFor(scripted, hailed.agentId));
			yield* body(captain, report);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

it.live("a captain reads a report its voyage landed, by the id it is shown", () =>
	withCaptain((captain, report) =>
		Effect.gen(function* () {
			const read = yield* callTool(captain, "read_voyage", {});
			expect(read.text).toContain(`- ${report.id} soundings — report`);

			const outcome = yield* callTool(captain, "read_report", {
				reportId: report.id,
			});
			expect(outcome).toEqual({
				ok: true,
				text: `# soundings\nreport\n\n${BODY}`,
			});
		}),
	),
);

it.live("a report landed on another voyage is refused, never served", () =>
	withCaptain((captain) =>
		Effect.gen(function* () {
			const elsewhere = yield* reportOnAnotherVoyage;
			expect(yield* callTool(captain, "read_report", { reportId: elsewhere.id })).toEqual({ ok: false, text: OUT_OF_REACH });
		}),
	),
);

it.live("an id nobody landed refuses exactly as a stranger's report does", () =>
	withCaptain((captain) =>
		Effect.gen(function* () {
			expect(yield* callTool(captain, "read_report", { reportId: "no-such-report" })).toEqual({ ok: false, text: OUT_OF_REACH });
		}),
	),
);

it.live("crew read a sibling piece's report and nothing across a hull", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const { alpha, bravo } = yield* chain;
			const sibling = yield* landedOn(alpha.id, "soundings");
			const elsewhere = yield* reportOnAnotherVoyage;
			const crew = yield* eventually(crewOn(scripted, bravo.id));

			expect(yield* callTool(crew, "read_report", { reportId: sibling.id })).toEqual({ ok: true, text: `# soundings\nreport\n\n${BODY}` });
			expect(yield* callTool(crew, "read_report", { reportId: elsewhere.id })).toEqual({ ok: false, text: OUT_OF_REACH });
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)));
	}),
);
