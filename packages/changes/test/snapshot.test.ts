import { persistenceIt } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { Changes } from "#index.ts";
import { changeOf } from "#test/change-fixtures.ts";
import {
	changesLayer,
	createPiece,
	createRepo,
	REEF_SOURCE,
} from "#test/change-harness.ts";

const it = persistenceIt();

it.effectDB(
	"fails its snapshot on invalid stored Change vocabulary",
	function* (db) {
		yield* createRepo("repo-reef", "reef", REEF_SOURCE);
		yield* db.Change.create({
			...changeOf({
				headRef: "work/reef",
				id: "change-invalid",
				repoId: "repo-reef",
				stage: "open",
			}),
			stage: "future_stage",
		});
		const failure = yield* Effect.gen(function* () {
			const changes = yield* Changes;
			return yield* Effect.flip(changes.snapshot);
		}).pipe(Effect.provide(changesLayer([])));
		expect(failure).toMatchObject({
			_tag: "StoredChangeInvalid",
			changeId: "change-invalid",
		});
	},
);

it.effectDB(
	"fails its snapshot on invalid stored PieceChange purpose",
	function* (db) {
		yield* Effect.all([
			createRepo("repo-reef", "reef", REEF_SOURCE),
			createPiece("piece-reef"),
		]);
		yield* db.Change.create(
			changeOf({
				headRef: "work/reef",
				id: "change-valid",
				repoId: "repo-reef",
				stage: "open",
			}),
		);
		yield* db.PieceChange.create({
			changeId: "change-valid",
			pieceId: "piece-reef",
			purpose: "future_purpose",
		});
		const failure = yield* Effect.gen(function* () {
			const changes = yield* Changes;
			return yield* Effect.flip(changes.snapshot);
		}).pipe(Effect.provide(changesLayer([])));
		expect(failure).toMatchObject({
			_tag: "StoredPieceChangeInvalid",
			changeId: "change-valid",
			pieceId: "piece-reef",
		});
	},
);
