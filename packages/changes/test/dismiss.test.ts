import { Changes } from "@antumbra/changes";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { changeOf } from "#test/change-fixtures.ts";

it.effectApp("a change that died at its host is dismissed once and stays so", function* ({ db }) {
	const changes = yield* Changes;
	const row = changeOf({ headRef: "work/dismissed", id: "change-dismissed", repoId: "repo-dismissed", stage: "withdrawn" });
	yield* db.Change.create(row);

	yield* changes.dismiss(row.id);
	yield* changes.dismiss(row.id);

	const verdicts = yield* db.ChangeVerdict.all();
	expect(verdicts).toHaveLength(1);
	expect(verdicts[0]?.verdict).toBe("dismissed");
	const [after] = yield* db.Change.where({ id: row.id }).all();
	expect(after?.stage).toBe("withdrawn");
	expect(yield* changes.snapshot()).toMatchObject({
		dismissedChangeIds: new Set([row.id]),
	});
});

it.effectApp("a change still alive at its host has nothing to dismiss", function* ({ db }) {
	const changes = yield* Changes;
	const row = changeOf({ headRef: "work/alive", id: "change-alive", repoId: "repo-alive", stage: "open" });
	yield* db.Change.create(row);

	const refused = yield* Effect.flip(changes.dismiss(row.id));

	expect(refused._tag).toBe("ChangeStillAlive");
	expect(yield* db.ChangeVerdict.where({ changeId: row.id }).all()).toEqual([]);
});

it.effectApp("a change nobody has heard of is refused by name", function* () {
	const changes = yield* Changes;

	const refused = yield* Effect.flip(changes.dismiss("no-such-change"));

	expect(refused._tag).toBe("ChangeNotFound");
});
