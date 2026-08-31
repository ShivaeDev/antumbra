import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { changeOf } from "#test/change-fixtures.ts";

const REEF = "/testing/repo-forget/reef";
const SHOAL = "/testing/repo-forget/shoal";

it.effectApp("forgetting one repo removes its change graph and leaves another intact", function* ({ db, repos }) {
	const reef = yield* repos.register({
		defaultRef: "main",
		source: REEF,
	});
	const shoal = yield* repos.register({
		defaultRef: "main",
		source: SHOAL,
	});
	const reefChange = changeOf({
		headRef: "work/repo-forget-reef",
		id: "repo-forget-reef-change",
		repoId: reef.id,
		stage: "open",
	});
	const shoalChange = changeOf({
		headRef: "work/repo-forget-shoal",
		id: "repo-forget-shoal-change",
		repoId: shoal.id,
		stage: "open",
	});
	const reefLink = {
		changeId: reefChange.id,
		pieceId: "repo-forget-reef-piece",
	};
	const shoalLink = {
		changeId: shoalChange.id,
		pieceId: "repo-forget-shoal-piece",
	};
	const reefTransition = {
		activityAt: reefChange.activityAt,
		changeId: reefChange.id,
		fromStage: "prepared" as const,
		id: "repo-forget-reef-transition",
		observedAt: reefChange.observedAt,
		toStage: "open" as const,
	};
	const shoalTransition = {
		activityAt: shoalChange.activityAt,
		changeId: shoalChange.id,
		fromStage: "prepared" as const,
		id: "repo-forget-shoal-transition",
		observedAt: shoalChange.observedAt,
		toStage: "open" as const,
	};
	yield* db.Change.create(reefChange);
	yield* db.Change.create(shoalChange);
	yield* db.PieceChange.create(reefLink);
	yield* db.PieceChange.create(shoalLink);
	yield* db.ChangeTransition.create(reefTransition);
	yield* db.ChangeTransition.create(shoalTransition);

	yield* repos.forget(reef.id);

	expect(yield* db.Repo.where({ id: reef.id }).exists()).toBe(false);
	expect(yield* db.Change.where({ id: reefChange.id }).exists()).toBe(false);
	expect(yield* db.PieceChange.where({ changeId: reefChange.id }).all()).toEqual([]);
	expect(yield* db.ChangeTransition.where({ changeId: reefChange.id }).all()).toEqual([]);
	expect(yield* db.Repo.where({ id: shoal.id }).exists()).toBe(true);
	expect((yield* db.Change.where({ id: shoalChange.id }).all()).map((row) => row.id)).toEqual([shoalChange.id]);
	expect((yield* db.PieceChange.where({ changeId: shoalChange.id }).all()).map((row) => row.pieceId)).toEqual([shoalLink.pieceId]);
	expect((yield* db.ChangeTransition.where({ changeId: shoalChange.id }).all()).map((row) => row.id)).toEqual([shoalTransition.id]);
});
