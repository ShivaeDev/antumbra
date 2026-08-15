import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { composeCaptainCharter } from "#charter-captain.ts";
import { composeCrewCharter } from "#charter-compose.ts";
import { AgentDomain } from "#domain.ts";
import type { PieceView } from "#piece-view.ts";
import {
	acquireTemporaryPersistence,
	dispatchingLayer,
	makeScriptedBackend,
	type ScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import { eventually, openReefVoyage, PATIENCE } from "#test/voyage-fixtures.ts";
import type { PieceRow, VoyageRow } from "#voyage-rows.ts";

const voyage: VoyageRow = {
	backend: "scripted",
	context: "the reef is uncharted",
	focusedAt: null,
	id: "voyage-1",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

const piece: PieceRow = {
	charter: "sound the shallows",
	expectation: "soundings are landed",
	id: "piece-1",
	launchedAt: null,
	parkedAt: null,
	role: "hand",
	title: "alpha",
};

const soundings: PieceView = {
	...piece,
	agents: [],
	artifacts: [],
	dependsOn: [],
	reports: [
		{
			authorAgentId: "agent-1",
			body: "the eastern shoal is charted",
			id: "report-1",
			title: "soundings",
		},
	],
	state: "done",
};

const chart: PieceView = {
	...piece,
	agents: [],
	artifacts: [],
	dependsOn: ["piece-1"],
	id: "piece-2",
	reports: [],
	state: "ready",
	title: "bravo",
};

it("a crew charter carries the voyage, the piece and the crew standing order", () => {
	const text = composeCrewCharter(voyage, piece, {
		pieceSmoothLog: [],
		voyageSmoothLog: [],
	});
	expect(text).toContain("# North star\nevery shoal is known");
	expect(text).toContain("# Your piece: alpha\nsound the shallows");
	expect(text).toContain("# Expected outcome\nsoundings are landed");
	expect(text).toContain("`land_report`");
	expect(text).toContain("`stand_down`");
	expect(text).not.toContain("`charter_piece`");
});

it("an empty log is left out of a charter rather than titled", () => {
	const bare = composeCrewCharter(voyage, piece, {
		pieceSmoothLog: [],
		voyageSmoothLog: [],
	});
	expect(bare).not.toContain("# Voyage log");
	expect(bare).not.toContain("# Piece log");

	const written = composeCrewCharter(voyage, piece, {
		pieceSmoothLog: ["the last hand reached the reef edge"],
		voyageSmoothLog: ["the eastern approach is safe", "the swell backs west"],
	});
	expect(written).toContain(
		"# Voyage log\nthe eastern approach is safe\n\nthe swell backs west",
	);
	expect(written).toContain("# Piece log\nthe last hand reached the reef edge");
});

it("a captain charter lists the pieces, their state and what landed", () => {
	const text = composeCaptainCharter(voyage, [soundings, chart], {
		voyageSmoothLog: ["the eastern approach is safe"],
	});
	expect(text).toContain("# Voyage log\nthe eastern approach is safe");
	expect(text).toContain("- piece-1 alpha [done] landed: soundings");
	expect(text).toContain("- piece-2 bravo [ready] depends on piece-1");
	expect(text).toContain("`charter_piece`");
	expect(text).toContain("`launch_piece`");
	expect(text).not.toContain("`land_report`");
});

it("a captain of a voyage with no pieces is told about no pieces", () => {
	expect(
		composeCaptainCharter(voyage, [], { voyageSmoothLog: [] }),
	).not.toContain("# Pieces");
});

const crewOf = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.PieceAgent.where({ pieceId }).all())[0];
		return row === undefined ? yield* Effect.fail("no crew yet") : row.agentId;
	});

const charterDelivered = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const live = yield* sessionFor(scripted, agentId);
		const sent = yield* live.sent;
		return sent[0] ?? (yield* Effect.fail("no charter yet"));
	});

it.live("a dispatched crew is told the smooth log, never the rough one", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const reef = yield* openReefVoyage;
			const alpha = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: reef.id,
			});
			const wrote = (body: string, register: "rough" | "smooth") =>
				domain.boards.write(
					{ kind: "voyage", voyageId: reef.id },
					{ authorAgentId: Option.none(), body, register },
				);
			yield* wrote("the eastern approach is safe", "smooth");
			yield* wrote("the swell is running", "rough");
			yield* domain.boards.write(
				{ kind: "piece", pieceId: alpha.id },
				{
					authorAgentId: Option.none(),
					body: "the last hand reached the reef edge",
					register: "smooth",
				},
			);
			yield* domain.voyages.launch(alpha.id);

			const agentId = yield* eventually(crewOf(alpha.id));
			const charter = yield* eventually(charterDelivered(scripted, agentId));
			expect(charter).toContain("the eastern approach is safe");
			expect(charter).toContain("the last hand reached the reef edge");
			expect(charter).not.toContain("the swell is running");
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);
