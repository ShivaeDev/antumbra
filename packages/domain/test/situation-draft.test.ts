import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect, it as test } from "@effect/vitest";
import { Effect } from "effect";
import { makeSituationDraft } from "#situation/draft.ts";
import { situationWords } from "#situation/words.ts";
import { changeOf } from "#test/change-fixtures.ts";

const CHANGE = changeOf({
	headRef: "chart-the-shoals",
	id: "42",
	repoId: "repo-1",
	stage: "open",
});

test("each situation draws its own template, filled from the change record", () => {
	const conflicts = situationWords("merge_conflicts", CHANGE, "Reef-Charts");
	expect(conflicts).toContain("merge conflicts");
	expect(conflicts).toContain("main");
	const checks = situationWords("checks_failed", CHANGE, "Reef-Charts");
	expect(checks).toContain("Checks are failing");
	const reviews = situationWords("unresolved_reviews", CHANGE, "Reef-Charts");
	expect(reviews).toContain("review comments");
});

test("every draft names the change, its branch and the repo it lives in", () => {
	const every = [
		situationWords("merge_conflicts", CHANGE, "Reef-Charts"),
		situationWords("checks_failed", CHANGE, "Reef-Charts"),
		situationWords("unresolved_reviews", CHANGE, "Reef-Charts"),
	];
	for (const words of every) {
		expect(words).toContain("#42");
		expect(words).toContain("chart-the-shoals");
		expect(words).toContain("Reef-Charts");
	}
});

it.effectApp("drafts name the requested change and its registered repo, falling back to the repo id", function* () {
	const db = yield* Database;
	yield* db.Repo.create({ id: CHANGE.repoId, name: "Reef-Charts", source: "/reefs/charts", defaultRef: "main" });
	yield* db.Change.create(CHANGE);
	yield* db.Change.create(changeOf({ id: "unrelated", repoId: "elsewhere", headRef: "another-branch", stage: "open" }));
	const draft = yield* makeSituationDraft();
	const request = { changeId: CHANGE.id, situation: "checks_failed" } as const;
	const named = yield* draft(request);
	expect(named).toContain("#42");
	expect(named).toContain(CHANGE.headRef);
	expect(named).toContain("Reef-Charts");
	expect(named).not.toContain("another-branch");
	yield* db.Repo.where({ id: CHANGE.repoId }).delete();
	expect(yield* draft(request)).toContain(CHANGE.repoId);
});

it.effectApp("missing and unpublished changes cannot be addressed by a situation draft", function* () {
	const db = yield* Database;
	yield* db.Change.create({ ...CHANGE, stage: "prepared", externalId: null });
	const draft = yield* makeSituationDraft();
	for (const changeId of ["missing", CHANGE.id]) {
		expect(yield* Effect.flip(draft({ changeId, situation: "merge_conflicts" }))).toMatchObject({
			_tag: "ChangeNotAddressable",
			changeId,
		});
	}
});
