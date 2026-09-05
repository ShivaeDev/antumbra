import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { readHeldResources } from "#submissions/held-resources.ts";
import { changeOf } from "#test/change-fixtures.ts";
import { createPiece, createRepo } from "#test/change-harness.ts";

it.effectDB("retains matching branches through shared Piece replacements and releases dismissed or landed Changes", function* (db) {
	const reef = yield* createRepo("reef", "reef", "/reef");
	const shoal = yield* createRepo("shoal", "shoal", "/shoal");
	yield* createPiece("shared");
	for (const fields of [
		{ headRef: "work", id: "first", repoId: reef.id, stage: "withdrawn" as const },
		{ headRef: "work", id: "second", repoId: reef.id, stage: "open" as const },
		{ headRef: "replacement", id: "replacement", repoId: shoal.id, stage: "prepared" as const },
	]) {
		yield* db.Change.create(changeOf(fields));
		yield* db.PieceChange.create({ changeId: fields.id, pieceId: "shared", purpose: fields.id === "replacement" ? "depends_on" : "produces" });
	}
	const resources = [
		{ branch: "work", id: "reef", source: reef.source },
		{ branch: "work", id: "shoal-other-branch", source: shoal.source },
		{ branch: "replacement", id: "shoal", source: shoal.source },
		{ branch: "work", id: "unregistered", source: "/absent" },
	];
	expect(yield* readHeldResources(resources)).toEqual(
		new Map([
			["reef", "first"],
			["shoal", "replacement"],
		]),
	);
	yield* db.ChangeVerdict.create({ changeId: "second", verdict: "dismissed" });
	expect(yield* readHeldResources(resources)).toEqual(
		new Map([
			["reef", "first"],
			["shoal", "replacement"],
		]),
	);
	yield* db.ChangeVerdict.create({ changeId: "first", verdict: "dismissed" });
	expect(yield* readHeldResources(resources)).toEqual(new Map([["shoal", "replacement"]]));
	yield* db.Change.where({ id: "replacement" }).update({ stage: "landed", landedAt: new Date("2026-08-16T00:00:00.000Z") });
	expect(yield* readHeldResources(resources)).toEqual(new Map());
});
