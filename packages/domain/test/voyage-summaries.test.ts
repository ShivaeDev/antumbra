import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { flagshipVoyage } from "#test/voyage-fixtures.ts";
import { VoyageSummaries } from "#voyage/summaries/service.ts";

const read = Effect.flatMap(VoyageSummaries, (summaries) => summaries.read());
const voyage = (id: string) => ({ id, name: id, context: id, northStar: id });
const chartered = (id: string, voyageId: string, dependsOn: ReadonlyArray<string> = []) =>
	Effect.gen(function* () {
		const pieces = yield* Pieces;
		yield* pieces.charter({ charter: id, dependsOn, expectation: id, id, role: "hand", title: id, voyageId });
		yield* pieces.launch(id);
	});
const root = (id: string, agentId: string, created: number) => ({
	id,
	agentId,
	createdAt: new Date(created),
	rootSessionId: id,
	cwd: "/tmp",
	status: "open",
	executionStatus: "idle",
});

const summaryOf = (voyageId: string) =>
	Effect.gen(function* () {
		for (const summary of yield* read) {
			if (summary.id === voyageId) {
				return summary;
			}
		}
		return yield* Effect.die(new Error(`the fleet holds no summary for ${voyageId}`));
	});

it.effectApp("fleet counts hold a member blocked until the prerequisite on another voyage lands", function* ({ db }) {
	const sailing = yield* Voyages;
	const pieces = yield* Pieces;
	const flagship = yield* flagshipVoyage;
	for (const id of ["first", "second", "empty"]) yield* sailing.open(voyage(id));
	yield* chartered("prerequisite", "second");
	yield* chartered("member", "first", ["prerequisite"]);
	const blocked = yield* read;
	expect(blocked.map((summary) => summary.id)).toEqual([flagship.id, "first", "second", "empty"]);
	expect(blocked.map((summary) => summary.counts.blocked)).toEqual([0, 1, 0, 0]);
	expect(blocked.map((summary) => Object.values(summary.counts).reduce((sum, count) => sum + count, 0))).toEqual([0, 1, 1, 0]);
	yield* pieces.landVerdict("prerequisite", "delivered");
	expect((yield* read).map((summary) => summary.counts.ready)).toEqual([0, 1, 0, 0]);
	yield* db.Agent.create({ id: "worker", charter: "work", role: "hand", status: "alive" });
	yield* db.AgentSession.create({ ...root("worker-root", "worker", 4), executionStatus: "active" });
	yield* db.PieceAgent.create({ pieceId: "member", agentId: "worker" });
	const working = yield* read;
	expect(working.slice(1).map((summary) => summary.counts.active)).toEqual([1, 0, 0]);
	expect(working.slice(1).map((summary) => summary.state)).toEqual(["underWay", "quiet", "quiet"]);
});

it.effectApp("parking an unanswered ruling keeps its member blocked until it is ruled", function* ({ db }) {
	const sailing = yield* Voyages;
	yield* sailing.open(voyage("gated"));
	yield* chartered("waiting", "gated");
	yield* db.Ruling.create({
		id: "gate",
		question: "Which course?",
		context: "The reef divides",
		radius: "piece",
		urgency: "blocking",
		requesterAuthority: "admiral",
	});
	yield* db.RulingGate.create({ id: "member-gate", rulingId: "gate", pieceId: "waiting" });
	expect((yield* summaryOf("gated")).counts.blocked).toBe(1);
	yield* db.Ruling.where({ id: "gate" }).update({ parkedAt: new Date(2), parkedNote: "Decide after soundings" });
	expect((yield* summaryOf("gated")).counts.blocked).toBe(1);
	yield* db.Ruling.where({ id: "gate" }).update({ ruledAt: new Date(3), answer: "East", ruledBy: "admiral" });
	expect((yield* summaryOf("gated")).counts.ready).toBe(1);
});

it.effectApp("fleet captain selection excludes outside workers while retired root history still stirs", function* ({ db }) {
	const sailing = yield* Voyages;
	yield* sailing.open(voyage("crewed"));
	yield* sailing.open(voyage("elsewhere"));
	yield* chartered("outside", "elsewhere");
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
	const summary = yield* summaryOf("crewed");
	expect(Option.getOrThrow(summary.captain)).toMatchObject({ agentId: "captain", atWork: false });
	expect(summary.lastStirredAt).toEqual(new Date(30));
	expect(summary.state).toBe("quiet");
	yield* db.AgentSession.where({ id: "captain-root" }).update({ executionStatus: "active" });
	const working = yield* summaryOf("crewed");
	expect(working.counts.active).toBe(0);
	expect(working.state).toBe("underWay");
});
