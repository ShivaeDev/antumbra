import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Option } from "effect";
import { readCaptains, readVoyageCaptain } from "#voyage-captain-read.ts";

it.effectDB("reads the standing captain's root Session and excludes Piece workers with the captain role", function* (db) {
	for (const id of ["voyage", "other-voyage"]) {
		yield* db.Voyage.create({
			captainBackend: "scripted",
			context: "chart the reef",
			crewBackend: "scripted",
			id,
			name: id,
			northStar: "a sound chart",
		});
	}
	yield* db.Piece.create({ charter: "sound the reef", expectation: "soundings", id: "piece", role: "captain", title: "Sound" });
	yield* db.VoyagePiece.create({ pieceId: "piece", voyageId: "voyage" });
	for (const [id, createdAt] of [
		["earlier", 0],
		["standing", 1],
		["worker", 2],
		["elsewhere", 3],
	] as const) {
		yield* db.Agent.create({ charter: id, createdAt: new Date(createdAt), currentSessionId: `${id}-root`, id, role: "captain", status: "alive" });
		yield* db.AgentSession.create({
			agentId: id,
			cwd: "/test",
			executionStatus: id === "earlier" ? "active" : "idle",
			id: `${id}-root`,
			rootSessionId: `${id}-root`,
			status: "open",
		});
		yield* db.VoyageAgent.create({ agentId: id, role: "captain", voyageId: id === "elsewhere" ? "other-voyage" : "voyage" });
	}
	yield* db.PieceAgent.create({ agentId: "worker", pieceId: "piece" });

	expect(Option.getOrThrow(yield* readVoyageCaptain("voyage"))).toMatchObject({ agentId: "earlier", atWork: true });
	yield* db.AgentSession.where({ id: "earlier-root" }).update({ executionStatus: "idle" });
	expect(Option.getOrThrow(yield* readVoyageCaptain("voyage"))).toEqual({
		agentId: "standing",
		atWork: false,
		sessionId: "standing-root",
		status: "alive",
	});
	expect(yield* readVoyageCaptain("empty-voyage")).toEqual(Option.none());

	const captains = yield* readCaptains(["voyage", "other-voyage", "empty-voyage"]);
	expect(Option.getOrThrow(captains.get("voyage") ?? Option.none()).agentId).toBe("standing");
	expect(Option.getOrThrow(captains.get("other-voyage") ?? Option.none()).agentId).toBe("elsewhere");
	expect(captains.get("empty-voyage")).toEqual(Option.none());
});
