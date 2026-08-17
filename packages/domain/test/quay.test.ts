import type { ChangeChecks, ChangeStage } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import type { ChangeRow } from "#change-rows.ts";
import { changeView } from "#change-view.ts";
import { type QuayGroup, quayGroup } from "#quay-group.ts";
import { quayPieces, quayRows } from "#quay-view.ts";
import type { PieceRow, VoyageWorld } from "#voyage-rows.ts";

const MOMENT = new Date("2026-08-15T09:00:00.000Z");

const piece = (id: string): PieceRow => ({
	charter: `do ${id}`,
	expectation: `${id} is landed`,
	id,
	launchedAt: MOMENT,
	parkedAt: null,
	role: "hand",
	title: id,
});

const change = (id: string, over: Partial<ChangeRow> = {}): ChangeRow => ({
	activityAt: MOMENT,
	baseRef: "main",
	body: "",
	checks: "green",
	draftAt: null,
	externalId: id,
	headRef: `work/${id}`,
	headSha: null,
	host: "github",
	id,
	landedAt: null,
	mergeable: "clean",
	observedAt: MOMENT,
	openedByAgentId: null,
	preparedHeadRef: null,
	preparedHeadSha: null,
	raw: null,
	repoId: "repo-1",
	review: "approved",
	stage: "open",
	submissionKey: null,
	title: id,
	url: `https://github.test/shoals/pull/${id}`,
	withdrawnAt: null,
	workingDiff: null,
	workingTreeStatus: null,
	worktreePath: null,
	...over,
});

const world = (over: Partial<VoyageWorld>): VoyageWorld => ({
	agentStatus: new Map(),
	artifacts: new Map(),
	assignments: [],
	changes: [],
	crews: [],
	edges: [],
	memberships: [{ pieceId: "alpha", voyageId: "voyage-1" }],
	pieceArtifacts: [],
	pieceChanges: [],
	pieceReports: [],
	pieces: [piece("alpha")],
	reports: new Map(),
	repos: new Map([["repo-1", { id: "repo-1", name: "shoals" }]]),
	voyages: [
		{
			backend: "scripted",
			context: "the reef is uncharted",
			focusedAt: null,
			id: "voyage-1",
			name: "Chart the reef",
			northStar: "every shoal is known",
		},
	],
	...over,
});

const onAlpha = (rows: ReadonlyArray<ChangeRow>): VoyageWorld =>
	world({
		changes: rows,
		pieceChanges: rows.map((row) => ({
			changeId: row.id,
			pieceId: "alpha",
			purpose: "produces",
		})),
	});

const groupOf = (over: Partial<ChangeRow>): QuayGroup =>
	quayGroup(changeView("shoals", change("one", over)));

it("a change ready to merge lies alongside", () => {
	expect(groupOf({})).toBe("alongside");
	expect(groupOf({ review: "none" })).toBe("alongside");
});

it("a draft is not offered yet, however green it is", () => {
	expect(groupOf({ draftAt: MOMENT })).toBe("draft");
});

it("red checks, a review asking for changes and a conflict all want a hand", () => {
	const wanting: ReadonlyArray<Partial<ChangeRow>> = [
		{ checks: "red" },
		{ review: "changes_requested" },
		{ mergeable: "conflict" },
		{ stage: "withdrawn" },
	];
	for (const over of wanting) {
		expect(groupOf(over)).toBe("needsAttention");
	}
});

it("anything still running or not yet clean is checks running", () => {
	expect(groupOf({ checks: "pending" })).toBe("checksRunning");
	expect(groupOf({ mergeable: "unknown" })).toBe("checksRunning");
});

// why: a host that reports no checks at all has nothing left to run, so a
// clean change lies alongside rather than waiting for a signal never coming.
it("no checks at all is not the same as checks still running", () => {
	const none: ChangeChecks = "none";
	expect(groupOf({ checks: none })).toBe("alongside");
});

it("a landed change leaves the quay; a withdrawn one stays until answered", () => {
	const stages: ReadonlyArray<ChangeStage> = ["landed", "withdrawn"];
	const [landed, withdrawn] = stages.map((stage) =>
		quayRows(onAlpha([change("one", { stage })])),
	);
	expect(landed).toEqual([]);
	expect(withdrawn?.map((row) => row.group)).toEqual(["needsAttention"]);
});

it("a withdrawn change leaves once the piece is waiting on another", () => {
	const rows = quayRows(
		onAlpha([change("one", { stage: "withdrawn" }), change("two")]),
	);
	expect(rows.map((row) => row.change.id)).toEqual(["two"]);
});

it("a row names the repo, the piece and the voyage the change is owed to", () => {
	const [row] = quayRows(onAlpha([change("one")]));
	expect(row?.change.repoName).toBe("shoals");
	expect(row?.pieceTitle).toBe("alpha");
	expect(row?.voyageName).toBe("Chart the reef");
});

it("the newest news is read first", () => {
	const older = change("older", {
		activityAt: new Date("2026-08-14T09:00:00.000Z"),
	});
	const rows = quayRows(onAlpha([older, change("newer")]));
	expect(rows.map((row) => row.change.id)).toEqual(["newer", "older"]);
});

it("every piece of every voyage may be adopted onto", () => {
	expect(quayPieces(world({}))).toEqual([
		{ id: "alpha", title: "alpha", voyageName: "Chart the reef" },
	]);
});
