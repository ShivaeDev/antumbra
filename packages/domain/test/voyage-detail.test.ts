import { changesLayer } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { ReposLive } from "@antumbra/repos";
import { RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { VoyageDetails } from "#voyage/detail/service.ts";
import { voyageView } from "#voyage-view.ts";

const layer = VoyageDetails.layer.pipe(
	Layer.provideMerge(changesLayer(new Map(), new Map())),
	Layer.provideMerge(PiecesLive),
	Layer.provideMerge(ReposLive),
	Layer.provideMerge(RulingsLive),
	Layer.provideMerge(DomainFeedsLive),
);
const read = (voyageId: string) => Effect.flatMap(VoyageDetails, (details) => details.read(voyageId)).pipe(Effect.provide(layer));
const piece = (id: string) => ({ id, title: id, charter: id, expectation: id, role: "hand", launchedAt: new Date(1) });
const voyage = (id: string) => ({ id, name: id, context: id, northStar: id, captainBackend: "scripted", crewBackend: "scripted" });
const agent = (id: string, createdAt: Date) => ({ id, status: "alive", role: "captain", charter: id, createdAt });
const root = (id: string, agentId: string, executionStatus = "idle") => ({
	id,
	agentId,
	executionStatus,
	rootSessionId: id,
	cwd: "/tmp",
	status: "open",
});

it.effectDB("a Voyage shows its members while direct external prerequisites govern readiness", function* (db) {
	for (const id of ["home", "other"]) yield* db.Voyage.create(voyage(id));
	for (const id of ["member", "prerequisite", "ancestor", "unrelated"]) yield* db.Piece.create(piece(id));
	yield* db.VoyagePiece.create({ voyageId: "home", pieceId: "member" });
	yield* db.VoyagePiece.create({ voyageId: "other", pieceId: "prerequisite" });
	yield* db.PieceEdge.create({ fromPieceId: "prerequisite", toPieceId: "member" });
	yield* db.PieceEdge.create({ fromPieceId: "ancestor", toPieceId: "prerequisite" });
	const blocked = Option.getOrThrow(yield* read("home"));
	expect(voyageView(blocked.rows, blocked.voyage).pieces).toMatchObject([{ id: "member", state: "blocked", dependsOn: ["prerequisite"] }]);
	yield* db.PieceVerdict.create({ pieceId: "prerequisite", verdict: "delivered" });
	yield* db.Agent.create(agent("reworking", new Date(2)));
	yield* db.AgentSession.create(root("reworking-root", "reworking", "active"));
	yield* db.PieceAgent.create({ pieceId: "prerequisite", agentId: "reworking" });
	const ready = Option.getOrThrow(yield* read("home"));
	const view = voyageView(ready.rows, ready.voyage);
	expect(view.pieces).toMatchObject([{ id: "member", state: "ready" }]);
	expect(view.counts.ready).toBe(1);
	expect(view.state).toBe("quiet");
	expect(new Set(ready.rows.pieces.map((row) => row.id))).toEqual(new Set(["member", "prerequisite"]));
	expect(Option.isNone(yield* read("missing"))).toBe(true);
});

it.effectDB("a captain assigned to work outside the Voyage is excluded from captain selection", function* (db) {
	yield* db.Voyage.create(voyage("home"));
	yield* db.Piece.create(piece("elsewhere"));
	for (const [id, born] of [
		["captain", 1],
		["worker", 2],
	] as const) {
		yield* db.Agent.create(agent(id, new Date(born)));
		yield* db.VoyageAgent.create({ voyageId: "home", agentId: id, role: "captain" });
		yield* db.AgentSession.create(root(`${id}-root`, id, id === "worker" ? "active" : "idle"));
	}
	yield* db.PieceAgent.create({ pieceId: "elsewhere", agentId: "worker" });
	const detail = Option.getOrThrow(yield* read("home"));
	const view = voyageView(detail.rows, detail.voyage);
	expect(Option.getOrThrow(view.captain)).toMatchObject({ agentId: "captain", atWork: false });
	expect(view.crew.map((member) => member.agentId)).toEqual(["captain", "worker"]);
	expect(view.state).toBe("quiet");
});

it.effectDB("retired crew root history stirs a Voyage without making it active", function* (db) {
	yield* db.Voyage.create(voyage("home"));
	yield* db.Agent.create({ ...agent("retired", new Date(1)), status: "retired" });
	yield* db.VoyageAgent.create({ voyageId: "home", agentId: "retired", role: "captain" });
	yield* db.AgentSession.create({ ...root("historical-root", "retired"), status: "closed", createdAt: new Date(20) });
	yield* db.AgentSession.create({
		...root("child", "retired"),
		rootSessionId: "historical-root",
		parentSessionId: "historical-root",
		status: "closed",
		createdAt: new Date(30),
	});
	yield* db.Agent.create(agent("unrelated", new Date(40)));
	yield* db.AgentSession.create({ ...root("unrelated-root", "unrelated"), createdAt: new Date(50) });
	const detail = Option.getOrThrow(yield* read("home"));
	const view = voyageView(detail.rows, detail.voyage);
	expect(view.lastStirredAt).toEqual(new Date(20));
	expect(view.state).toBe("quiet");
	expect(view.crew).toEqual([{ agentId: "retired", role: "captain", status: "retired" }]);
});
