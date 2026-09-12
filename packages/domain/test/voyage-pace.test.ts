import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { voyagePace } from "#execution/voyage-pace.ts";
import { changeOf } from "#test/change-fixtures.ts";

const HOME = ["held", "waiting", "parked", "running", "abandoned", "done", "pending"];

const openVoyage = (id: string) => Effect.flatMap(Voyages, (sailing) => sailing.open({ context: id, id, name: id, northStar: id }));

const charterOn = (voyageId: string, id: string) =>
	Effect.flatMap(Pieces, (pieces) => pieces.charter({ charter: id, dependsOn: [], expectation: id, id, role: "hand", title: id, voyageId }));

const seedHome = Effect.gen(function* () {
	const db = yield* Database;
	yield* openVoyage("home");
	yield* openVoyage("other");
	yield* Effect.forEach(HOME, (id) => charterOn("home", id));
	yield* charterOn("other", "foreign");
	const pieces = yield* Pieces;
	yield* Effect.forEach(["waiting", "running"], (id) => pieces.launch(id));
	yield* pieces.park("parked", true);
	yield* db.Agent.create({ id: "worker", role: "hand", charter: "running", status: "spawning" });
	yield* db.PieceAgent.create({ pieceId: "running", agentId: "worker" });
	yield* pieces.landVerdict("abandoned", "abandoned");
	yield* Effect.forEach(["done", "pending"], (pieceId) => pieces.landVerdict(pieceId, "delivered"));
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
