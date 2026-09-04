import { persistenceIt } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Option } from "effect";
import { readVoyageCaptain } from "#voyage-captain-read.ts";

const it = persistenceIt();

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
		["standing", 1],
		["worker", 2],
		["elsewhere", 3],
	] as const) {
		yield* db.Agent.create({ charter: id, createdAt: new Date(createdAt), currentSessionId: `${id}-root`, id, role: "captain", status: "alive" });
		yield* db.AgentSession.create({
			agentId: id,
			cwd: "/test",
			executionStatus: "idle",
			id: `${id}-root`,
			rootSessionId: `${id}-root`,
			status: "open",
		});
		yield* db.VoyageAgent.create({ agentId: id, role: "captain", voyageId: id === "elsewhere" ? "other-voyage" : "voyage" });
	}
	yield* db.PieceAgent.create({ agentId: "worker", pieceId: "piece" });

	expect(Option.getOrThrow(yield* readVoyageCaptain("voyage"))).toEqual({
		agentId: "standing",
		atWork: false,
		sessionId: "standing-root",
		status: "alive",
	});
	expect(yield* readVoyageCaptain("empty-voyage")).toEqual(Option.none());
});
