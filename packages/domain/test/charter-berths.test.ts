import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
	CAPTAIN_BERTH_ORDER,
	type CharterBerth,
	CREW_BERTH_ORDER,
	withBerths,
} from "#charter-berths.ts";
import { composeCaptainCharter } from "#charter-captain.ts";
import { composeCrewCharter } from "#charter-compose.ts";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	dispatchingLayer,
	makeScriptedBackend,
	makeScriptedRunner,
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

const NO_LOGS = { pieceSmoothLog: [], voyageSmoothLog: [] };

const antumbra: CharterBerth = {
	branch: "work/a1b2c3d4/antumbra",
	path: "/moorage/a1b2c3d4/antumbra",
	repo: "Antumbra",
};

const charts: CharterBerth = {
	branch: "work/a1b2c3d4/reef-charts",
	path: "/moorage/a1b2c3d4/reef-charts",
	repo: "Reef-Charts",
};

const crewCharter = (berths: ReadonlyArray<CharterBerth>) =>
	withBerths(
		composeCrewCharter(voyage, piece, NO_LOGS),
		berths,
		CREW_BERTH_ORDER,
	);

const captainCharter = (berths: ReadonlyArray<CharterBerth>) =>
	withBerths(
		composeCaptainCharter(voyage, [], { voyageSmoothLog: [] }),
		berths,
		CAPTAIN_BERTH_ORDER,
	);

it("an agent with no berths is told of none and ordered about none", () => {
	expect(crewCharter([])).toBe(composeCrewCharter(voyage, piece, NO_LOGS));
	expect(crewCharter([])).not.toContain("# Berths");
	expect(captainCharter([])).not.toContain("# Berths");
});

it("a berth is named by its registry name, its worktree and its branch", () => {
	expect(crewCharter([antumbra])).toContain(
		"# Berths\nAntumbra — worktree /moorage/a1b2c3d4/antumbra — branch work/a1b2c3d4/antumbra",
	);
});

it("the registry name is printed, never the berth directory's slug", () => {
	const text = crewCharter([antumbra]);
	expect(text).toContain("Antumbra — worktree");
	expect(text).not.toContain("antumbra — worktree");
});

it("every berth is a line of its own", () => {
	expect(crewCharter([antumbra, charts])).toContain(
		[
			"# Berths",
			"Antumbra — worktree /moorage/a1b2c3d4/antumbra — branch work/a1b2c3d4/antumbra",
			"Reef-Charts — worktree /moorage/a1b2c3d4/reef-charts — branch work/a1b2c3d4/reef-charts",
		].join("\n"),
	);
});

it("the berth order joins the standing orders and precedes the berths", () => {
	const text = crewCharter([antumbra]);
	expect(text.indexOf("`stand_down`")).toBeLessThan(
		text.indexOf(CREW_BERTH_ORDER),
	);
	expect(text.indexOf(CREW_BERTH_ORDER)).toBeLessThan(text.indexOf("# Berths"));
	expect(text).toContain("`open_change`");
});

it("a captain is told the same berths without crew tools it does not hold", () => {
	const text = captainCharter([antumbra]);
	expect(text).toContain("# Berths\nAntumbra — worktree");
	expect(text).toContain(CAPTAIN_BERTH_ORDER);
	expect(text).not.toContain("`open_change`");
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

it.live("a dispatched crew is told the worktree it was berthed in", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorder = yield* makeScriptedRunner;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* domain.repos.register({
				defaultRef: "main",
				source: "/somewhere/Reef-Charts",
			});
			const reef = yield* openReefVoyage;
			const alpha = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: reef.id,
			});
			yield* domain.voyages.launch(alpha.id);

			const agentId = yield* eventually(crewOf(alpha.id));
			const charter = yield* eventually(charterDelivered(scripted, agentId));
			expect(charter).toContain(
				`Reef-Charts — worktree /tmp/moorage/${agentId}/berth-0 — branch work/${agentId.slice(0, 8)}/berth-0`,
			);
			expect(charter).toContain(CREW_BERTH_ORDER);
		}).pipe(
			Effect.provide(
				dispatchingLayer(
					temporary,
					scripted.backend,
					PATIENCE,
					{},
					recorder.runner,
				),
			),
		);
	}),
);
