import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { heldPieceCount } from "#execution/held-piece-count.ts";
import { changeOf } from "#test/change-fixtures.ts";

it.effectApp("counts only unlaunched voyage work without active execution or settled outcomes", function* ({ db }) {
	for (const id of ["home", "other"])
		yield* db.Voyage.create({ id, name: id, context: id, northStar: id, captainBackend: "scripted", crewBackend: "scripted" });
	for (const id of ["held", "launched", "parked", "active", "abandoned", "done", "pending", "foreign"]) {
		yield* db.Piece.create({ id, title: id, charter: id, expectation: id, role: "hand" });
		yield* db.VoyagePiece.create({ pieceId: id, voyageId: id === "foreign" ? "other" : "home" });
	}
	yield* db.Piece.where({ id: "launched" }).update({ launchedAt: new Date(1) });
	yield* db.Piece.where({ id: "parked" }).update({ parkedAt: new Date(1) });
	yield* db.Agent.create({ id: "worker", role: "hand", charter: "active", status: "spawning" });
	yield* db.PieceAgent.create({ pieceId: "active", agentId: "worker" });
	yield* db.PieceVerdict.create({ pieceId: "abandoned", verdict: "abandoned" });
	for (const pieceId of ["done", "pending"]) yield* db.PieceVerdict.create({ pieceId, verdict: "delivered" });
	yield* db.Repo.create({ id: "repo", name: "repo", source: "repo", defaultRef: "main" });
	yield* db.Change.create(changeOf({ id: "change", headRef: "work", repoId: "repo", stage: "open" }));
	yield* db.PieceChange.create({ pieceId: "pending", changeId: "change" });
	expect(yield* heldPieceCount("home")).toBe(2);
	yield* db.Change.where({ id: "change" }).update({ stage: "landed", landedAt: new Date(2) });
	expect(yield* heldPieceCount("home")).toBe(1);
});
