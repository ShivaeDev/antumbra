import { changesLayer } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { Pieces } from "@antumbra/pieces";
import { scriptedPieces } from "@antumbra/pieces/testing";
import { RulingsLive } from "@antumbra/rulings";
import { scriptedRoleSettings, scriptedSettings, scriptedVoyages } from "@antumbra/testing-runtime";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { agentsAtWork } from "#agent-at-work.ts";
import { crewRest } from "#crew-rest.ts";
import { readyPieces } from "#dispatch-policy.ts";
import { ExecutionSource } from "#execution/service.ts";
import { pieceOutcomeTallies } from "#outcome-status.ts";
import { concludedPieces, pieceStates } from "#piece-state.ts";
import { changeOf } from "#test/change-fixtures.ts";
import { assignedExecution } from "#voyage-execution-selection.ts";

const layer = ExecutionSource.layer.pipe(
	Layer.provideMerge(changesLayer(new Map(), new Map())),
	Layer.provideMerge(RulingsLive),
	Layer.provideMerge(scriptedPieces),
	Layer.provideMerge(scriptedVoyages),
	Layer.provideMerge(scriptedRoleSettings),
	Layer.provideMerge(DomainFeedsLive),
	Layer.provideMerge(scriptedSettings),
);
const dispatch = Effect.flatMap(ExecutionSource, (source) => source.dispatch());
const retirement = Effect.flatMap(ExecutionSource, (source) => source.retirement());
const voyage = (id: string) => ({ id, name: id, context: id, northStar: id });
const chartered = (id: string, voyageId: string, options: { dependsOn?: ReadonlyArray<string>; held?: boolean; parked?: boolean } = {}) =>
	Effect.gen(function* () {
		const pieces = yield* Pieces;
		yield* pieces.charter({ charter: id, dependsOn: options.dependsOn ?? [], expectation: id, id, role: "hand", title: id, voyageId });
		if (options.held !== true) {
			yield* pieces.launch(id);
		}
		if (options.parked === true) {
			yield* pieces.park(id, true);
		}
	});
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
	yield* Effect.gen(function* () {
		const sailing = yield* Voyages;
		const pieces = yield* Pieces;
		for (const id of ["home", "other"]) yield* sailing.open(voyage(id));
		yield* chartered("cross-prerequisite", "other", { held: true });
		yield* chartered("home-prerequisite", "home", { held: true });
		yield* chartered("candidate", "home", { dependsOn: ["cross-prerequisite", "home-prerequisite"] });
		yield* chartered("held", "home", { held: true });
		yield* chartered("parked", "home", { parked: true });
		yield* pieces.landVerdict("cross-prerequisite", "delivered");
		yield* db.Agent.create(agent("reworking"));
		yield* db.AgentSession.create(root("reworking-root", "reworking", "active"));
		yield* db.PieceAgent.create({ pieceId: "cross-prerequisite", agentId: "reworking" });
		const world = yield* dispatch;
		expect(new Set(world.pieces.map((row) => row.id))).toEqual(new Set(["candidate", "cross-prerequisite", "home-prerequisite"]));
		expect(pieceStates(world).get("cross-prerequisite")).toBe("active");
		expect(readyPieces(world)).toEqual([]);
		yield* pieces.landVerdict("home-prerequisite", "delivered");
		expect(readyPieces(yield* dispatch).map((ready) => ready.voyage.id)).toEqual(["home"]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("dispatch budgets unassigned working agents and preserves current-root selection", function* (db) {
	yield* Effect.gen(function* () {
		for (const id of ["unassigned", "idle", "without-root"]) yield* db.Agent.create(agent(id));
		yield* db.Agent.create(agent("starting", "spawning"));
		yield* db.Agent.create(agent("retired", "retired"));
		yield* db.AgentSession.create(root("unassigned-root", "unassigned", "active"));
		yield* db.AgentSession.create({ ...root("older-root", "idle", "active"), status: "closed", createdAt: new Date(1) });
		yield* db.AgentSession.create({ ...root("newer-root", "idle"), createdAt: new Date(2) });
		yield* Effect.flatMap(Voyages, (sailing) => sailing.open(voyage("home")));
		yield* chartered("candidate", "home");
		yield* db.PieceAgent.create({ pieceId: "candidate", agentId: "idle" });
		const world = yield* dispatch;
		expect(agentsAtWork(world)).toBe(3);
		expect(assignedExecution(world, "candidate")).toMatchObject({ _tag: "resume", sessionId: "newer-root" });
		yield* db.Agent.where({ id: "idle" }).update({ currentSessionId: "newer-root" });
		yield* db.AgentSession.where({ id: "newer-root" }).update({ executionStatus: "active" });
		const pointed = yield* dispatch;
		expect(agentsAtWork(pointed)).toBe(4);
		expect(assignedExecution(pointed, "candidate")).toEqual({ _tag: "unavailable", agentId: "idle" });
	}).pipe(Effect.provide(layer));
});

it.effectDB("scoped outcome reads retain dismissed and withdrawn links while replacement work lands", function* (db) {
	yield* Effect.gen(function* () {
		yield* Effect.flatMap(Voyages, (sailing) => sailing.open(voyage("home")));
		yield* chartered("candidate", "home");
		yield* Effect.flatMap(Pieces, (pieces) => pieces.landVerdict("candidate", "delivered"));
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
		expect(pieceOutcomeTallies(world).get("candidate")).toEqual({ landed: 2, pending: 2 });
		expect(pieceStates(world).get("candidate")).toBe("landing");
		yield* db.Change.where({ id: "replacement" }).update({ stage: "landed", landedAt: new Date(3) });
		expect(pieceStates(yield* dispatch).get("candidate")).toBe("done");
	}).pipe(Effect.provide(layer));
});

it.effectDB("retirement reads alive crew's concluded work and retains working co-assignees", function* (db) {
	yield* Effect.gen(function* () {
		const pieces = yield* Pieces;
		yield* Effect.flatMap(Voyages, (sailing) => sailing.open(voyage("home")));
		for (const id of ["done", "reworking", "unfinished", "history"]) yield* chartered(id, "home", { held: true });
		yield* chartered("abandoned", "home", { held: true, parked: true });
		for (const id of ["done", "reworking", "history"]) yield* pieces.landVerdict(id, "delivered");
		yield* pieces.landVerdict("abandoned", "abandoned");
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
		const { resting, retirable } = crewRest(world, runtime);
		expect(resting.has("rested")).toBe(true);
		expect(retirable.has("abandoned-hand")).toBe(true);
		expect(retirable.has("busy")).toBe(false);
	}).pipe(Effect.provide(layer));
});
