import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { changeOf } from "#test/change-fixtures.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";

const REEF = "/somewhere/reef";
const SHOAL = "/somewhere/shoal";

it.live("forgetting a repo removes its entire change graph atomically", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const backend = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const writer = yield* Writer;
			const reef = yield* domain.repos.register({
				defaultRef: "main",
				source: REEF,
			});
			const shoal = yield* domain.repos.register({
				defaultRef: "main",
				source: SHOAL,
			});
			const reefChange = changeOf({
				headRef: "work/reef",
				id: "change-reef",
				repoId: reef.id,
				stage: "open",
			});
			const shoalChange = changeOf({
				headRef: "work/shoal",
				id: "change-shoal",
				repoId: shoal.id,
				stage: "open",
			});
			yield* writer.write(
				Effect.all([
					db.Change.create(reefChange),
					db.Change.create(shoalChange),
					db.PieceChange.create({
						changeId: reefChange.id,
						pieceId: "piece-reef",
					}),
					db.PieceChange.create({
						changeId: shoalChange.id,
						pieceId: "piece-shoal",
					}),
					db.ChangeTransition.create({
						activityAt: reefChange.activityAt,
						changeId: reefChange.id,
						fromStage: "prepared",
						id: "transition-reef",
						observedAt: reefChange.observedAt,
						toStage: "open",
					}),
					db.ChangeTransition.create({
						activityAt: shoalChange.activityAt,
						changeId: shoalChange.id,
						fromStage: "prepared",
						id: "transition-shoal",
						observedAt: shoalChange.observedAt,
						toStage: "open",
					}),
				]),
			);

			yield* domain.repos.forget(reef.id);

			expect((yield* db.Repo.all()).map((row) => row.id)).toEqual([shoal.id]);
			expect((yield* db.Change.all()).map((row) => row.id)).toEqual([
				shoalChange.id,
			]);
			expect((yield* db.PieceChange.all()).map((row) => row.changeId)).toEqual([
				shoalChange.id,
			]);
			expect(
				(yield* db.ChangeTransition.all()).map((row) => row.changeId),
			).toEqual([shoalChange.id]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend.backend)));
	}),
);
