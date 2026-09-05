import type { ChangeRow } from "@antumbra/changes";
import type { ChangeChecks, ChangeStage } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { changeView } from "#change-view.ts";
import { type QuayGroup, quayGroup } from "#quay/group.ts";
import type { QuayRecords } from "#quay/records.ts";
import { quayReading } from "#quay/view.ts";
import type { PieceRow } from "#voyage-rows.ts";

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
	originSessionId: null,
	preparedHeadRef: null,
	preparedHeadSha: null,
	proposalFrozenAt: null,
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

const world = (over: Partial<QuayRecords>): QuayRecords => ({
	changes: [],
	dismissedChangeIds: new Set(),
	memberships: [{ pieceId: "alpha", voyageId: "voyage-1" }],
	pieceChanges: [],
	pieces: [piece("alpha")],
	repos: new Map([["repo-1", { id: "repo-1", name: "shoals" }]]),
	sessions: [],
	voyages: [
		{
			id: "voyage-1",
			name: "Chart the reef",
		},
	],
	...over,
});

const onAlpha = (rows: ReadonlyArray<ChangeRow>): QuayRecords =>
	world({
		changes: rows,
		pieceChanges: rows.map((row) => ({
			changeId: row.id,
			pieceId: "alpha",
			purpose: "produces",
		})),
	});

const groupOf = (over: Partial<ChangeRow>): QuayGroup => quayGroup(changeView("shoals", change("one", over)));

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

it("no checks at all is not the same as checks still running", () => {
	const none: ChangeChecks = "none";
	expect(groupOf({ checks: none })).toBe("alongside");
});

it("a landed change leaves the quay; a withdrawn one stays until answered", () => {
	const stages: ReadonlyArray<ChangeStage> = ["landed", "withdrawn"];
	const [landed, withdrawn] = stages.map((stage) => quayReading(onAlpha([change("one", { stage })])).rows);
	expect(landed).toEqual([]);
	expect(withdrawn?.map((row) => row.group)).toEqual(["needsAttention"]);
});

it("a withdrawn change stays in sight while a replacement is under way", () => {
	const rows = quayReading(onAlpha([change("one", { stage: "withdrawn" }), change("two")])).rows;
	expect(rows.map((row) => row.change.id).sort()).toEqual(["one", "two"]);
});

it("a dismissed change leaves the quay and its needs-attention group", () => {
	const withdrawn = onAlpha([change("one", { stage: "withdrawn" })]);
	expect(quayReading({ ...withdrawn, dismissedChangeIds: new Set(["one"]) }).rows).toEqual([]);
});

it("a row carries its pull request detail and where the change is owed", () => {
	const [row] = quayReading(
		onAlpha([
			change("one", {
				baseRef: "release",
				body: "## Why\n\nWarn the harbour.",
				headRef: "work/warning",
				headSha: "0123456789abcdef",
			}),
		]),
	).rows;
	expect(row?.change.repoName).toBe("shoals");
	expect(row?.body).toBe("## Why\n\nWarn the harbour.");
	expect(row?.headRef).toBe("work/warning");
	expect(row?.baseRef).toBe("release");
	expect(row?.headSha).toBe("0123456789abcdef");
	expect(row?.pieceTitle).toBe("alpha");
	expect(row?.voyageName).toBe("Chart the reef");
});

it("a row carries the opener's canonical stored session association", () => {
	const associated = onAlpha([
		change("one", {
			openedByAgentId: "agent-one",
			originSessionId: "session-one",
		}),
	]);
	const [row] = quayReading({
		...associated,
		sessions: [
			{
				agentId: "agent-one",
				id: "session-one",
			},
		],
	}).rows;
	expect(row?.originSessionId).toBe("session-one");
});

it("a row without a resolvable opener session admits there is no association", () => {
	const [adopted] = quayReading(onAlpha([change("adopted")])).rows;
	const stale = onAlpha([
		change("stale", {
			openedByAgentId: "agent-one",
			originSessionId: "session-missing",
		}),
	]);
	const [unresolved] = quayReading(stale).rows;

	expect(adopted?.originSessionId).toBeNull();
	expect(unresolved?.originSessionId).toBeNull();
});

it("the newest news is read first", () => {
	const older = change("older", {
		activityAt: new Date("2026-08-14T09:00:00.000Z"),
	});
	const rows = quayReading(onAlpha([older, change("newer")])).rows;
	expect(rows.map((row) => row.change.id)).toEqual(["newer", "older"]);
});

it("every piece of every voyage may be adopted onto", () => {
	expect(quayReading(world({})).pieces).toEqual([{ id: "alpha", title: "alpha", voyageName: "Chart the reef" }]);
});

it("shared work keeps each voyage and Change link in its input order", () => {
	const reading = quayReading(
		world({
			changes: [change("first"), change("second")],
			memberships: [
				{ pieceId: "alpha", voyageId: "east" },
				{ pieceId: "alpha", voyageId: "west" },
			],
			pieceChanges: [
				{ changeId: "first", pieceId: "alpha", purpose: "produces" },
				{ changeId: "first", pieceId: "alpha", purpose: "depends_on" },
				{ changeId: "second", pieceId: "alpha", purpose: "produces" },
			],
			voyages: [
				{ id: "west", name: "West" },
				{ id: "east", name: "East" },
			],
		}),
	);
	expect(reading.pieces).toEqual([
		{ id: "alpha", title: "alpha", voyageName: "East" },
		{ id: "alpha", title: "alpha", voyageName: "West" },
	]);
	expect(reading.rows.map((row) => [row.change.id, row.voyageId])).toEqual([
		["first", "east"],
		["first", "west"],
		["first", "east"],
		["first", "west"],
		["second", "east"],
		["second", "west"],
	]);
});
