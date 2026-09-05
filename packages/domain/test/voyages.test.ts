import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Artifacts } from "@antumbra/artifacts";
import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { VoyageProcedureService } from "#voyages/service.ts";

const openVoyage = Effect.gen(function* () {
	const voyages = yield* Voyages;
	return yield* voyages.open({ context: "the reef is uncharted", name: "Chart the reef", northStar: "every shoal is known" });
});

const charter = (voyageId: string, title: string, dependsOn: ReadonlyArray<string> = []) =>
	Effect.flatMap(Pieces, (owner) =>
		owner.charter({
			charter: `do ${title}`,
			dependsOn,
			expectation: `${title} is landed`,
			role: "hand",
			title,
			voyageId,
		}),
	);

const stateOf = (voyageId: string, title: string) =>
	Effect.gen(function* () {
		const voyages = yield* VoyageProcedureService;
		const view = Option.getOrThrow(yield* voyages.read(voyageId));
		return view.pieces.find((piece) => piece.title === title)?.state;
	});

const acquireMoorage = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-voyage-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

it.effectApp("a voyage holds the pieces chartered into it, gated by edges", function* () {
	const voyages = yield* VoyageProcedureService;
	const voyage = yield* openVoyage;
	const first = yield* charter(voyage.id, "sound the shallows");
	const second = yield* charter(voyage.id, "draw the chart", [first.id]);
	const db = yield* Database;
	yield* db.Piece.where({ id: first.id }).update({ createdAt: new Date(1) });
	yield* db.Piece.where({ id: second.id }).update({ createdAt: new Date(2) });
	const view = Option.getOrThrow(yield* voyages.read(voyage.id));
	expect(view.name).toBe("Chart the reef");
	expect(view.state).toBe("quiet");
	expect(view.pieces.map((piece) => piece.title)).toEqual(["sound the shallows", "draw the chart"]);
	expect(view.pieces.find((piece) => piece.id === second.id)?.dependsOn).toEqual([first.id]);
	expect(view.pieces.map((piece) => piece.state)).toEqual(["held", "held"]);
});

it.effectApp("chartering onto a piece that does not exist is refused", function* () {
	const voyage = yield* openVoyage;
	const failure = yield* Effect.flip(charter(voyage.id, "sail nowhere", ["no-such-piece"]));
	expect(failure._tag).toBe("PieceNotFound");
});

it.effectApp("rewiring may never make a piece depend on itself", function* () {
	const voyages = yield* VoyageProcedureService;
	const pieces = yield* Pieces;
	const voyage = yield* openVoyage;
	const alpha = yield* charter(voyage.id, "alpha");
	const beta = yield* charter(voyage.id, "beta", [alpha.id]);
	const gamma = yield* charter(voyage.id, "gamma", [beta.id]);

	const loop = yield* Effect.flip(pieces.setDependencies(alpha.id, [alpha.id]));
	expect(loop._tag).toBe("EdgeWouldCycle");
	const cycle = yield* Effect.flip(pieces.setDependencies(alpha.id, [gamma.id]));
	expect(cycle._tag).toBe("EdgeWouldCycle");

	yield* pieces.setDependencies(gamma.id, [alpha.id]);
	const view = Option.getOrThrow(yield* voyages.read(voyage.id));
	expect(view.pieces.find((piece) => piece.id === gamma.id)?.dependsOn).toEqual([alpha.id]);
});

it.effectApp("launching walks a piece from held to ready, its dependent blocked", function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const pieces = yield* Pieces;
	const voyage = yield* openVoyage;
	const first = yield* charter(voyage.id, "sound");
	const second = yield* charter(voyage.id, "draw", [first.id]);

	yield* pieces.launch(first.id);
	yield* pieces.launch(second.id);
	expect(yield* stateOf(voyage.id, "sound")).toBe("ready");
	expect(yield* stateOf(voyage.id, "draw")).toBe("blocked");

	yield* pieces.launch(first.id);
	expect(yield* stateOf(voyage.id, "sound")).toBe("ready");
});

it.effectApp("a landed report is the only thing that makes a piece done", function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const voyages = yield* VoyageProcedureService;
	const pieces = yield* Pieces;
	const reports = yield* Reports;
	const voyage = yield* openVoyage;
	const first = yield* charter(voyage.id, "sound");
	const second = yield* charter(voyage.id, "draw", [first.id]);
	yield* pieces.launch(first.id);
	yield* pieces.launch(second.id);

	const report = yield* reports.land({
		body: "three fathoms at the eastern spit",
		pieceId: first.id,
		title: "soundings",
	});
	expect(yield* stateOf(voyage.id, "sound")).toBe("done");
	expect(yield* stateOf(voyage.id, "draw")).toBe("ready");

	const view = Option.getOrThrow(yield* voyages.read(voyage.id));
	expect(view.pieces.find((piece) => piece.id === first.id)?.reports).toMatchObject([
		{
			authorAgentId: null,
			body: "three fathoms at the eastern spit",
			id: report.id,
			title: "soundings",
		},
	]);
});

it.effectApp("a landed artifact carries its author and lands the piece", function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const db = yield* Database;
	const pieces = yield* Pieces;
	const artifacts = yield* Artifacts;
	const reports = yield* Reports;
	const voyage = yield* openVoyage;
	const piece = yield* charter(voyage.id, "draw");
	yield* pieces.launch(piece.id);
	const moorage = yield* acquireMoorage;
	writeFileSync(join(moorage, "reef.md"), "# Reef\n");
	yield* db.Agent.create({
		charter: "draw the reef",
		id: "agent-cartographer",
		role: "cartographer",
		status: "alive",
	});
	yield* db.Moorage.create({
		agentId: "agent-cartographer",
		reclaimState: null,
		root: moorage,
		runner: "local",
		status: "ready",
	});
	const artifact = yield* artifacts.land({
		authorAgentId: "agent-cartographer",
		path: "reef.md",
		pieceId: piece.id,
		title: "the chart",
	});
	expect(artifact.artifact.authorAgentId).toBe("agent-cartographer");
	expect(yield* stateOf(voyage.id, "draw")).toBe("done");

	const orphan = yield* Effect.flip(
		reports.land({
			body: "nowhere",
			pieceId: "no-such-piece",
			title: "lost",
		}),
	);
	expect(orphan._tag).toBe("PieceNotFound");
});

it.effectApp("parking holds a ready piece back until it is unparked", function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const pieces = yield* Pieces;
	const voyage = yield* openVoyage;
	const piece = yield* charter(voyage.id, "sound");
	yield* pieces.launch(piece.id);
	yield* pieces.park(piece.id, true);
	expect(yield* stateOf(voyage.id, "sound")).toBe("parked");
	yield* pieces.park(piece.id, false);
	expect(yield* stateOf(voyage.id, "sound")).toBe("ready");
});

it.effectApp("the list carries every voyage with its piece counts and focus", function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const voyages = yield* VoyageProcedureService;
	const pieces = yield* Pieces;
	const voyage = yield* openVoyage;
	const first = yield* charter(voyage.id, "sound");
	yield* charter(voyage.id, "draw", [first.id]);
	yield* pieces.launch(first.id);
	const voyageRecords = yield* Voyages;
	yield* voyageRecords.setFocus(voyage.id, true);

	const listed = yield* voyages.list();
	expect(listed).toHaveLength(2);
	const flagship = listed.find((row) => row.kind === "flagship");
	expect(flagship).toMatchObject({ name: "Flagship", state: "quiet" });
	const target = listed.find((row) => row.id === voyage.id);
	expect(target?.focusedAt).not.toBeNull();
	expect(target?.state).toBe("quiet");
	expect(target?.counts).toEqual({
		abandoned: 0,
		active: 0,
		blocked: 0,
		done: 0,
		held: 1,
		landing: 0,
		parked: 0,
		ready: 1,
	});

	yield* voyageRecords.setFocus(voyage.id, false);
	expect((yield* voyages.list()).find((row) => row.id === voyage.id)?.focusedAt).toBeNull();
	expect(Option.isNone(yield* voyages.read("no-such-voyage"))).toBe(true);
});
