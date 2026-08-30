import type { ChangeView, QuayGroup, QuayView } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { lastSight } from "#quay/groups.ts";
import { changeMarks, changeNumber, hasLanded } from "#quay/marks.ts";

const change = (over: Partial<ChangeView> = {}): ChangeView => ({
	activityAt: "2026-08-19T09:20:00.000Z",
	checks: "green",
	externalId: "41",
	host: "github",
	id: "change-1",
	isDraft: false,
	mergeable: "clean",
	observedAt: "2026-08-19T09:22:00.000Z",
	repoId: "repo-1",
	repoName: "shoals",
	review: "approved",
	stage: "open",
	title: "warn on the northern shoal",
	url: "https://github.test/shoals/pull/41",
	...over,
});

const quay = (rows: ReadonlyArray<{ group: QuayGroup; observedAt?: string }>): QuayView => ({
	hosts: [],
	pieces: [],
	rows: rows.map((row, index) => ({
		baseRef: "main",
		body: "",
		change: change({
			id: `change-${index}`,
			...(row.observedAt === undefined ? {} : { observedAt: row.observedAt }),
		}),
		group: row.group,
		headRef: "work/change",
		headSha: null,
		originSessionId: null,
		pieceId: "piece-1",
		pieceTitle: "soundings",
		voyageId: "voyage-1",
		voyageName: "Chart the reef",
	})),
});

const labels = (view: ChangeView): ReadonlyArray<string> => changeMarks(view).map((mark) => mark.label);

const keys = (view: ChangeView): ReadonlyArray<string> => changeMarks(view).map((mark) => mark.key);

const tones = (view: ChangeView): ReadonlyArray<string> => changeMarks(view).map((mark) => mark.tone);

describe("a change's marks", () => {
	it("puts checks, review and the merge in the same three places", () => {
		expect(keys(change())).toEqual(["checks", "review", "merge"]);
		expect(keys(change({ checks: "none", review: "none" }))).toEqual(["checks", "review", "merge"]);
	});

	it("says where each step stands rather than punctuating a line", () => {
		expect(labels(change())).toEqual(["checks passed", "approved", "merges cleanly"]);
		expect(
			labels(
				change({
					checks: "red",
					mergeable: "conflict",
					review: "changes_requested",
				}),
			),
		).toEqual(["checks failed", "changes requested", "conflicts"]);
	});

	it("colours a step by what it asks of a reader", () => {
		expect(tones(change())).toEqual(["success", "success", "success"]);
		expect(tones(change({ checks: "pending", review: "pending" }))).toEqual(["warning", "info", "success"]);
		expect(tones(change({ checks: "none", mergeable: "unknown" }))).toEqual(["muted", "success", "muted"]);
	});

	it("a merged change says only that, and recedes", () => {
		const merged = change({ stage: "landed" });
		expect(labels(merged)).toEqual(["merged"]);
		expect(tones(merged)).toEqual(["muted"]);
		expect(hasLanded(merged)).toBe(true);
		expect(hasLanded(change())).toBe(false);
	});

	it("a change closed without merging does not read as a failed check", () => {
		const withdrawn = change({ checks: "green", stage: "withdrawn" });
		expect(labels(withdrawn)).toEqual(["closed without merging"]);
		expect(tones(withdrawn)).toEqual(["destructive"]);
	});

	it("a change that never reached a host reports no steps", () => {
		expect(labels(change({ stage: "prepared" }))).toEqual(["not offered yet"]);
	});

	it("names a change by its number only where the host gave one", () => {
		expect(changeNumber(change())).toBe("#41");
		expect(changeNumber(change({ externalId: null }))).toBe("");
	});
});

describe("how old the reading is", () => {
	it("speaks for the whole quay with its newest stamp", () => {
		const view = quay([
			{ group: "alongside", observedAt: "2026-08-19T09:00:00.000Z" },
			{ group: "draft", observedAt: "2026-08-19T11:30:00.000Z" },
			{ group: "draft", observedAt: "2026-08-19T10:15:00.000Z" },
		]);
		expect(lastSight(view)).toBe("2026-08-19T11:30:00.000Z");
	});

	it("an empty quay has never been sighted", () => {
		expect(lastSight(quay([]))).toBeUndefined();
	});
});
