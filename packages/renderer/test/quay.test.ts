import type { ChangeView } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { groupTitle, QUAY_GROUPS } from "#quay/groups.ts";
import { changeMarks, changeName } from "#voyages/change-marks.ts";

const change = (id: string, over: Partial<ChangeView> = {}): ChangeView => ({
	activityAt: "2026-08-15T09:20:00.000Z",
	checks: "green",
	externalId: "41",
	host: "github",
	id,
	isDraft: false,
	mergeable: "clean",
	observedAt: "2026-08-15T09:22:00.000Z",
	repoId: "repo-1",
	repoName: "shoals",
	review: "approved",
	stage: "open",
	title: "warn on the northern shoal",
	url: "https://github.test/shoals/pull/41",
	...over,
});

describe("the quay's groups", () => {
	it("reads top-down as attention deserved", () => {
		expect(QUAY_GROUPS.map((group) => groupTitle[group])).toEqual(["Alongside", "Needs attention", "Checks running", "Draft"]);
	});
});

describe("changeMarks", () => {
	it("says the stage, then what the host last reported", () => {
		expect(changeMarks(change("one"))).toBe("open · ✓ · ✓ · ⚓");
		expect(
			changeMarks(
				change("one", {
					checks: "red",
					mergeable: "conflict",
					review: "changes_requested",
				}),
			),
		).toBe("open · ✗ · ✎ · ⚡");
	});

	it("a landed change says only that it merged", () => {
		expect(changeMarks(change("one", { stage: "landed" }))).toBe("✓ merged");
	});

	it("a mark the vocabulary leaves blank drops out of the line", () => {
		expect(changeMarks(change("one", { review: "none" }))).toBe("open · ✓ · ⚓");
	});
});

describe("changeName", () => {
	it("names a change by its number where the host gave one", () => {
		expect(changeName(change("one"))).toBe("#41 warn on the northern shoal");
		expect(changeName(change("one", { externalId: null }))).toBe("warn on the northern shoal");
	});
});
