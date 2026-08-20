import type { ChangeView, QuayGroup, QuayView } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { groupTitle, QUAY_GROUPS, rowsIn } from "#quay/groups.ts";
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

const quay = (groups: ReadonlyArray<QuayGroup>): QuayView => ({
	hosts: [{ available: true, detail: "signed in as navigator", tag: "github" }],
	pieces: [],
	rows: groups.map((group, index) => ({
		change: change(`change-${index}`),
		group,
		pieceId: "piece-1",
		pieceTitle: "soundings",
		voyageId: "voyage-1",
		voyageName: "Chart the reef",
	})),
});

describe("the quay's groups", () => {
	it("reads top-down as attention deserved", () => {
		expect(QUAY_GROUPS.map((group) => groupTitle[group])).toEqual([
			"Alongside",
			"Needs attention",
			"Checks running",
			"Draft",
		]);
	});

	it("shows each group only the changes that lie in it", () => {
		const view = quay(["draft", "alongside", "draft"]);
		expect(rowsIn(view, "draft").map((row) => row.change.id)).toEqual([
			"change-0",
			"change-2",
		]);
		expect(rowsIn(view, "checksRunning")).toEqual([]);
	});

	it("an empty quay has nothing in any group", () => {
		const view = quay([]);
		expect(QUAY_GROUPS.flatMap((group) => rowsIn(view, group))).toEqual([]);
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
		expect(changeMarks(change("one", { review: "none" }))).toBe(
			"open · ✓ · ⚓",
		);
	});
});

describe("changeName", () => {
	it("names a change by its number where the host gave one", () => {
		expect(changeName(change("one"))).toBe("#41 warn on the northern shoal");
		expect(changeName(change("one", { externalId: null }))).toBe(
			"warn on the northern shoal",
		);
	});
});
