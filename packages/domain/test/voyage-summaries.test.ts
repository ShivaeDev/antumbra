import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { VoyageSummaries } from "#voyage/summaries/service.ts";

const read = Effect.flatMap(VoyageSummaries, (summaries) => summaries.read());
const voyage = (id: string, born: number) => ({
	id,
	name: id,
	context: id,
	northStar: id,
	captainBackend: "scripted",
	crewBackend: "scripted",
	createdAt: new Date(born),
});
const piece = (id: string) => ({ id, title: id, charter: id, expectation: id, role: "hand", launchedAt: new Date(1) });
const root = (id: string, agentId: string, created: number) => ({
	id,
	agentId,
	createdAt: new Date(created),
	rootSessionId: id,
	cwd: "/tmp",
	status: "open",
	executionStatus: "idle",
});

it.effectApp("fleet counts include shared members and settle their unberthed prerequisites", function* ({ db }) {
	for (const [id, born] of [
		["second", 2],
		["first", 1],
		["empty", 3],
	] as const)
		yield* db.Voyage.create(voyage(id, born));
	for (const id of ["member", "prerequisite", "unrelated"]) yield* db.Piece.create(piece(id));
	for (const voyageId of ["first", "second"]) yield* db.VoyagePiece.create({ voyageId, pieceId: "member" });
	yield* db.PieceEdge.create({ fromPieceId: "prerequisite", toPieceId: "member" });
	const flagship = Option.getOrThrow(yield* db.Voyage.where({ kind: "flagship" }).first());
	const blocked = yield* read;
	expect(blocked.map((summary) => summary.id)).toEqual(["first", "second", "empty", flagship.id]);
	expect(blocked.map((summary) => summary.counts.blocked)).toEqual([1, 1, 0, 0]);
	expect(blocked.map((summary) => Object.values(summary.counts).reduce((sum, count) => sum + count, 0))).toEqual([1, 1, 0, 0]);
	yield* db.PieceVerdict.create({ pieceId: "prerequisite", verdict: "delivered" });
	expect((yield* read).map((summary) => summary.counts.ready)).toEqual([1, 1, 0, 0]);
	yield* db.Agent.create({ id: "worker", charter: "work", role: "hand", status: "alive" });
	yield* db.AgentSession.create({ ...root("worker-root", "worker", 4), executionStatus: "active" });
	yield* db.PieceAgent.create({ pieceId: "member", agentId: "worker" });
	const working = yield* read;
	expect(working.slice(0, 3).map((summary) => summary.counts.active)).toEqual([1, 1, 0]);
	expect(working.slice(0, 3).map((summary) => summary.state)).toEqual(["underWay", "underWay", "quiet"]);
});

it.effectApp("parking an unanswered ruling keeps its member blocked until it is ruled", function* ({ db }) {
	yield* db.Voyage.create(voyage("gated", 1));
	yield* db.Piece.create(piece("waiting"));
	yield* db.VoyagePiece.create({ voyageId: "gated", pieceId: "waiting" });
	yield* db.Ruling.create({
		id: "gate",
		question: "Which course?",
		context: "The reef divides",
		radius: "piece",
		urgency: "blocking",
		requesterAuthority: "admiral",
	});
	yield* db.RulingGate.create({ id: "member-gate", rulingId: "gate", pieceId: "waiting" });
	expect((yield* read)[0]?.counts.blocked).toBe(1);
	yield* db.Ruling.where({ id: "gate" }).update({ parkedAt: new Date(2), parkedNote: "Decide after soundings" });
	expect((yield* read)[0]?.counts.blocked).toBe(1);
	yield* db.Ruling.where({ id: "gate" }).update({ ruledAt: new Date(3), answer: "East", ruledBy: "admiral" });
	expect((yield* read)[0]?.counts.ready).toBe(1);
});

it.effectApp("fleet captain selection excludes outside workers while retired root history still stirs", function* ({ db }) {
	yield* db.Voyage.create(voyage("crewed", 1));
	yield* db.Piece.create(piece("outside"));
	for (const [id, born, status] of [
		["worker", 1, "alive"],
		["captain", 2, "alive"],
		["retired", 3, "retired"],
	] as const) {
		yield* db.Agent.create({ id, charter: id, role: "hand", status, createdAt: new Date(born) });
		yield* db.VoyageAgent.create({ voyageId: "crewed", agentId: id, role: id === "retired" ? "hand" : "captain" });
		yield* db.AgentSession.create({
			...root(`${id}-root`, id, born * 10),
			status: status === "retired" ? "closed" : "open",
			executionStatus: id === "worker" ? "active" : "idle",
		});
	}
	yield* db.PieceAgent.create({ pieceId: "outside", agentId: "worker" });
	yield* db.AgentSession.create({
		...root("child", "retired", 40),
		parentSessionId: "retired-root",
		rootSessionId: "retired-root",
		status: "closed",
	});
	const summaries = yield* read;
	expect(Option.getOrThrow(Option.getOrThrow(Option.fromUndefinedOr(summaries[0])).captain)).toMatchObject({ agentId: "captain", atWork: false });
	expect(summaries[0]?.lastStirredAt).toEqual(new Date(30));
	expect(summaries[0]?.state).toBe("quiet");
	yield* db.AgentSession.where({ id: "captain-root" }).update({ executionStatus: "active" });
	const working = (yield* read)[0];
	expect(working?.counts.active).toBe(0);
	expect(working?.state).toBe("underWay");
});
