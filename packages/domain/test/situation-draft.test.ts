import { expect, it } from "@effect/vitest";
import { situationWords } from "#situation-draft.ts";
import { changeOf } from "#test/change-fixtures.ts";

const CHANGE = changeOf({
	headRef: "chart-the-shoals",
	id: "42",
	repoId: "repo-1",
	stage: "open",
});

it("each situation draws its own template, filled from the change record", () => {
	const conflicts = situationWords("merge_conflicts", CHANGE, "Reef-Charts");
	expect(conflicts).toContain("merge conflicts");
	expect(conflicts).toContain("main");
	const checks = situationWords("checks_failed", CHANGE, "Reef-Charts");
	expect(checks).toContain("Checks are failing");
	const reviews = situationWords("unresolved_reviews", CHANGE, "Reef-Charts");
	expect(reviews).toContain("review comments");
});

// why: the draft has to name the change the admiral is looking at. A number
// carried over from somewhere else would send an Agent at a stranger's branch.
it("every draft names the change, its branch and the repo it lives in", () => {
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
