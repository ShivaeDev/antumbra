import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { situationsForPieces } from "#situations/for-pieces.ts";
import { changeOf } from "#test/change-fixtures.ts";
import { createPiece, createRepo } from "#test/change-harness.ts";

it.effectDB("only producing Pieces carry their Changes' situations", function* (db) {
	const repo = yield* createRepo("reef", "reef", "/reef");
	for (const pieceId of ["producer", "reviewer", "dependent", "unrelated"]) {
		yield* createPiece(pieceId);
	}
	const change = { ...changeOf({ headRef: "work", id: "42", repoId: repo.id, stage: "open" }), mergeable: "conflict" as const };
	yield* db.Change.create(change);
	for (const link of [
		{ pieceId: "producer", purpose: "produces" },
		{ pieceId: "reviewer", purpose: "reviews" },
		{ pieceId: "dependent", purpose: "depends_on" },
		{ pieceId: "unrelated", purpose: "produces" },
	]) {
		yield* db.PieceChange.create({ ...link, changeId: change.id });
	}
	const situations = yield* situationsForPieces(["producer", "reviewer", "dependent"]);
	expect(situations).toEqual(
		new Map([
			["producer", [{ changeId: "42", reference: "#42", situation: "merge_conflicts" }]],
			["reviewer", []],
			["dependent", []],
		]),
	);
});
