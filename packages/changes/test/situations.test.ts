import { expect, it } from "@effect/vitest";
import type { ChangeRow } from "#change-rows.ts";
import { situationsOf } from "#situations/of-change.ts";
import { changeOf } from "#test/change-fixtures.ts";

const change = (overrides: Partial<ChangeRow>): ChangeRow => ({
	...changeOf({ headRef: "work", id: "change-1", repoId: "repo-1", stage: "open" }),
	externalId: "42",
	...overrides,
});

const kinds = (row: ChangeRow) => situationsOf(row).map((entry) => entry.situation);

it("a change the record says is well is addressable for nothing", () => {
	expect(situationsOf(change({}))).toEqual([]);
});

it("each situation appears only when its own fact is on the record", () => {
	expect(kinds(change({ mergeable: "conflict" }))).toEqual(["merge_conflicts"]);
	expect(kinds(change({ checks: "red" }))).toEqual(["checks_failed"]);
	expect(kinds(change({ review: "changes_requested" }))).toEqual(["unresolved_reviews"]);
});

it("a change in trouble three ways offers all three, each naming it", () => {
	const troubled = change({
		checks: "red",
		mergeable: "conflict",
		review: "changes_requested",
	});
	expect(kinds(troubled)).toEqual(["merge_conflicts", "checks_failed", "unresolved_reviews"]);
	for (const entry of situationsOf(troubled)) {
		expect(entry.changeId).toBe("change-1");
		expect(entry.reference).toBe("#42");
	}
});

it("a change the host is not presenting is addressable for nothing", () => {
	expect(situationsOf(change({ mergeable: "conflict", stage: "landed" }))).toEqual([]);
	expect(situationsOf(change({ externalId: null, mergeable: "conflict" }))).toEqual([]);
});
