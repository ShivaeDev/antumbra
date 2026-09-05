import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { voyagePace } from "#execution/voyage-pace.ts";
import { changeOf } from "#test/change-fixtures.ts";

const HOME = ["held", "waiting", "parked", "running", "abandoned", "done", "pending"];

const openVoyage = (id: string) => Effect.flatMap(Database, (db) => db.Voyage.create({ id, name: id, context: id, northStar: id }));

const charterOn = (voyageId: string, id: string) =>
	Effect.flatMap(Database, (db) =>
		db.Piece.create({ id, title: id, charter: id, expectation: id, role: "hand" }).pipe(
			Effect.andThen(db.VoyagePiece.create({ pieceId: id, voyageId })),
		),
	);

const seedHome = Effect.gen(function* () {
	const db = yield* Database;
	yield* openVoyage("home");
	yield* openVoyage("other");
	yield* Effect.forEach(HOME, (id) => charterOn("home", id));
	yield* charterOn("other", "foreign");
	yield* Effect.forEach(["waiting", "running"], (id) => db.Piece.where({ id }).update({ launchedAt: new Date(1) }));
	yield* db.Piece.where({ id: "parked" }).update({ parkedAt: new Date(1) });
	yield* db.Agent.create({ id: "worker", role: "hand", charter: "running", status: "spawning" });
	yield* db.PieceAgent.create({ pieceId: "running", agentId: "worker" });
	yield* db.PieceVerdict.create({ pieceId: "abandoned", verdict: "abandoned" });
	yield* Effect.forEach(["done", "pending"], (pieceId) => db.PieceVerdict.create({ pieceId, verdict: "delivered" }));
	yield* db.Repo.create({ id: "repo", name: "repo", source: "repo", defaultRef: "main" });
	yield* db.Change.create(changeOf({ id: "change", headRef: "work", repoId: "repo", stage: "open" }));
	yield* db.PieceChange.create({ pieceId: "pending", changeId: "change" });
});

it.effectApp("counts the voyage's running, waiting and unlaunched pieces beside the fleet's limit", function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
	const db = yield* Database;
	yield* seedHome;

	expect(yield* voyagePace("home")).toEqual({ limit: 4, running: 1, unlaunched: 2, waiting: 1 });

	yield* db.Change.where({ id: "change" }).update({ stage: "landed", landedAt: new Date(2) });
	yield* settings.change({ key: "maxParallelSessions", value: 2 });

	expect(yield* voyagePace("home")).toEqual({ limit: 2, running: 1, unlaunched: 1, waiting: 1 });
});
