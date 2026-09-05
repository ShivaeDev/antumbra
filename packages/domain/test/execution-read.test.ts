import { ChangesLive } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { agentsAtWork } from "#agent-at-work.ts";
import { restingCrew, retirableCrew } from "#crew-rest.ts";
import { readyPieces } from "#dispatch-policy.ts";
import { ExecutionSource } from "#execution/service.ts";
import { pieceOutcomeTally } from "#outcome-status.ts";
import { concludedPieces, pieceStates } from "#piece-state.ts";
import { changeOf } from "#test/change-fixtures.ts";
import { assignedExecution } from "#voyage-execution-selection.ts";

const layer = ExecutionSource.layer.pipe(
	Layer.provideMerge(ChangesLive(new Map(), new Map())),
	Layer.provideMerge(PiecesLive),
	Layer.provideMerge(RulingsLive),
	Layer.provideMerge(DomainFeedsLive),
);
const dispatch = Effect.flatMap(ExecutionSource, (source) => source.dispatch()).pipe(Effect.provide(layer));
const retirement = Effect.flatMap(ExecutionSource, (source) => source.retirement()).pipe(Effect.provide(layer));
const piece = (id: string, launchedAt: Date | null = new Date(1)) => ({ id, title: id, charter: id, expectation: id, role: "hand", launchedAt });
const voyage = (id: string) => ({ id, name: id, context: id, northStar: id, captainBackend: "scripted", crewBackend: "scripted" });
const agent = (id: string, status = "alive") => ({ id, status, role: "hand", charter: id });
const root = (id: string, agentId: string, executionStatus = "idle") => ({
	id,
	agentId,
	executionStatus,
	rootSessionId: id,
	cwd: "/tmp",
	status: "open",
});

it.effectDB("dispatch includes direct prerequisites across berthings without reading unrelated work", function* (db) {
	for (const id of ["home", "other"]) yield* db.Voyage.create(voyage(id));
	for (const id of ["candidate", "unmembered", "parked"]) yield* db.Piece.create(piece(id));
	for (const id of ["cross-prerequisite", "unmembered-prerequisite", "held"]) yield* db.Piece.create(piece(id, null));
	yield* db.Piece.where({ id: "parked" }).update({ parkedAt: new Date(2) });
	for (const id of ["candidate", "held", "parked"]) yield* db.VoyagePiece.create({ pieceId: id, voyageId: "home" });
	yield* db.VoyagePiece.create({ pieceId: "candidate", voyageId: "other" });
	yield* db.VoyagePiece.create({ pieceId: "cross-prerequisite", voyageId: "other" });
	for (const id of ["cross-prerequisite", "unmembered-prerequisite"]) {
		yield* db.PieceEdge.create({ fromPieceId: id, toPieceId: "candidate" });
		yield* db.PieceVerdict.create({ pieceId: id, verdict: "delivered" });
	}
	yield* db.Agent.create(agent("reworking"));
	yield* db.AgentSession.create(root("reworking-root", "reworking", "active"));
	yield* db.PieceAgent.create({ pieceId: "cross-prerequisite", agentId: "reworking" });
	const world = yield* dispatch;
	expect(new Set(world.pieces.map((row) => row.id))).toEqual(new Set(["candidate", "cross-prerequisite", "unmembered-prerequisite"]));
	expect(pieceStates(world).get("cross-prerequisite")).toBe("active");
	expect(
		readyPieces(world)
			.map((ready) => ready.voyage.id)
			.sort(),
	).toEqual(["home", "other"]);
	yield* db.PieceVerdict.where({ pieceId: "unmembered-prerequisite" }).deleteAll();
	expect(readyPieces(yield* dispatch)).toEqual([]);
});

it.effectDB("dispatch budgets unassigned working agents and preserves current-root selection", function* (db) {
	for (const id of ["unassigned", "idle", "without-root"]) yield* db.Agent.create(agent(id));
	yield* db.Agent.create(agent("starting", "spawning"));
	yield* db.Agent.create(agent("retired", "retired"));
	yield* db.AgentSession.create(root("unassigned-root", "unassigned", "active"));
	yield* db.AgentSession.create({ ...root("older-root", "idle", "active"), status: "closed", createdAt: new Date(1) });
	yield* db.AgentSession.create({ ...root("newer-root", "idle"), createdAt: new Date(2) });
	yield* db.Piece.create(piece("candidate"));
	yield* db.Voyage.create(voyage("home"));
	yield* db.VoyagePiece.create({ pieceId: "candidate", voyageId: "home" });
	yield* db.PieceAgent.create({ pieceId: "candidate", agentId: "idle" });
	const world = yield* dispatch;
	expect(agentsAtWork(world)).toBe(3);
	expect(assignedExecution(world, "candidate")).toMatchObject({ _tag: "resume", sessionId: "newer-root" });
	yield* db.Agent.where({ id: "idle" }).update({ currentSessionId: "newer-root" });
	yield* db.AgentSession.where({ id: "newer-root" }).update({ executionStatus: "active" });
	const pointed = yield* dispatch;
	expect(agentsAtWork(pointed)).toBe(4);
	expect(assignedExecution(pointed, "candidate")).toEqual({ _tag: "unavailable", agentId: "idle" });
});

it.effectDB("scoped outcome reads retain dismissed and withdrawn links while replacement work lands", function* (db) {
	yield* db.Piece.create(piece("candidate"));
	yield* db.PieceVerdict.create({ pieceId: "candidate", verdict: "delivered" });
	yield* db.Voyage.create(voyage("home"));
	yield* db.VoyagePiece.create({ pieceId: "candidate", voyageId: "home" });
	for (const [id, stage] of [
		["landed", "landed"],
		["dismissed", "withdrawn"],
		["withdrawn", "withdrawn"],
		["replacement", "open"],
		["unrelated", "open"],
	] as const) {
		yield* db.Change.create(changeOf({ id, stage, headRef: id, repoId: "repo" }));
		if (id !== "unrelated") yield* db.PieceChange.create({ pieceId: "candidate", changeId: id });
	}
	yield* db.ChangeVerdict.create({ changeId: "dismissed", verdict: "dismissed" });
	const world = yield* dispatch;
	expect(new Set(world.changes.map((row) => row.id))).toEqual(new Set(["landed", "dismissed", "withdrawn", "replacement"]));
	expect(pieceOutcomeTally(world, "candidate")).toEqual({ landed: 2, pending: 2 });
	expect(pieceStates(world).get("candidate")).toBe("landing");
	yield* db.Change.where({ id: "replacement" }).update({ stage: "landed", landedAt: new Date(3) });
	expect(pieceStates(yield* dispatch).get("candidate")).toBe("done");
});

it.effectDB("retirement reads alive crew's concluded work and retains working co-assignees", function* (db) {
	for (const id of ["done", "abandoned", "reworking", "unfinished", "history"]) yield* db.Piece.create(piece(id, null));
	yield* db.Piece.where({ id: "abandoned" }).update({ parkedAt: new Date(1) });
	for (const id of ["done", "reworking", "history"]) yield* db.PieceVerdict.create({ pieceId: id, verdict: "delivered" });
	yield* db.PieceVerdict.create({ pieceId: "abandoned", verdict: "abandoned" });
	for (const id of ["rested", "abandoned-hand", "busy", "unfinished-hand"]) {
		yield* db.Agent.create(agent(id));
		yield* db.AgentSession.create(root(`${id}-root`, id, id === "busy" ? "active" : "idle"));
	}
	yield* db.Agent.create(agent("starting", "spawning"));
	yield* db.Agent.create(agent("old-hand", "retired"));
	for (const [pieceId, agentId] of [
		["done", "rested"],
		["abandoned", "abandoned-hand"],
		["abandoned", "busy"],
		["reworking", "rested"],
		["reworking", "starting"],
		["unfinished", "unfinished-hand"],
		["history", "old-hand"],
	] as const) {
		yield* db.PieceAgent.create({ pieceId, agentId });
	}
	const world = yield* retirement;
	expect(new Set(world.pieces.map((row) => row.id))).toEqual(new Set(["done", "abandoned", "reworking", "unfinished"]));
	expect(concludedPieces(world)).toEqual(
		new Map([
			["done", "done"],
			["abandoned", "abandoned"],
		]),
	);
	const runtime = { attached: new Set(world.sessions.map((session) => session.id)), delegating: new Set<string>() };
	expect(restingCrew(world, runtime).has("rested")).toBe(true);
	expect(retirableCrew(world, runtime).has("abandoned-hand")).toBe(true);
	expect(retirableCrew(world, runtime).has("busy")).toBe(false);
});
