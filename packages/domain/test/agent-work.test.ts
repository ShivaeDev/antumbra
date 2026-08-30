import type { ChangeRow } from "@antumbra/changes";
import { expect, it } from "@effect/vitest";
import { type WorkLinks, workOf } from "#agent-work.ts";

const change = (overrides: Partial<ChangeRow>): ChangeRow => ({
	activityAt: new Date(0),
	baseRef: "main",
	body: "",
	checks: "green",
	draftAt: null,
	externalId: "42",
	headRef: "chart-the-shoals",
	headSha: null,
	host: "github",
	id: "change-1",
	landedAt: null,
	mergeable: "clean",
	observedAt: new Date(0),
	openedByAgentId: null,
	originSessionId: null,
	preparedHeadRef: null,
	preparedHeadSha: null,
	proposalFrozenAt: null,
	raw: null,
	repoId: "repo-1",
	review: "none",
	stage: "open",
	submissionKey: null,
	title: "chart the shoals",
	url: null,
	withdrawnAt: null,
	workingDiff: null,
	workingTreeStatus: null,
	worktreePath: null,
	...overrides,
});

const links = (overrides?: Partial<WorkLinks>): WorkLinks => ({
	assignments: [{ agentId: "agent-1", pieceId: "piece-1" }],
	changes: [],
	crews: [{ agentId: "captain", role: "captain", voyageId: "voyage-1" }],
	dismissedChangeIds: new Set(),
	memberships: [
		{ pieceId: "piece-1", voyageId: "voyage-1" },
		{ pieceId: "piece-2", voyageId: "voyage-1" },
	],
	pieceChanges: [],
	pieces: [
		{ id: "piece-1", title: "soundings" },
		{ id: "piece-2", title: "the chart" },
	],
	repos: new Map([["repo-1", { id: "repo-1", name: "shoals" }]]),
	voyages: [{ id: "voyage-1", name: "the reef" }],
	...overrides,
});

const soundings = {
	changes: [],
	kind: "piece" as const,
	pieceId: "piece-1",
	pieceTitle: "soundings",
	voyageId: "voyage-1",
	voyageName: "the reef",
};

it("names the one piece an agent is assigned to and its voyage", () => {
	expect(workOf(links(), "agent-1")).toEqual([soundings]);
});

it("names every piece an agent is assigned to, in assignment order", () => {
	expect(
		workOf(
			links({
				assignments: [
					{ agentId: "agent-1", pieceId: "piece-2" },
					{ agentId: "agent-1", pieceId: "piece-1" },
				],
			}),
			"agent-1",
		).map((work) => (work.kind === "piece" ? work.pieceTitle : work.kind)),
	).toEqual(["the chart", "soundings"]);
});

// why: a captain answers to the voyage directly, so its work is the voyage —
// and it stays a captain only while no piece claims it, the same rule the
// voyage reads its own captain by.
it("names a captain by the voyage it commands", () => {
	expect(workOf(links(), "captain")).toEqual([
		{ kind: "voyage", voyageId: "voyage-1", voyageName: "the reef" },
	]);
	expect(
		workOf(
			links({
				assignments: [{ agentId: "captain", pieceId: "piece-1" }],
			}),
			"captain",
		),
	).toEqual([{ ...soundings }]);
});

it("an agent assigned to nothing and commanding nothing has no work", () => {
	expect(workOf(links(), "agent-2")).toEqual([]);
	expect(
		workOf(
			links({
				crews: [{ agentId: "agent-2", role: "hand", voyageId: "voyage-1" }],
			}),
			"agent-2",
		),
	).toEqual([]);
});

const produced = (row: ChangeRow, overrides?: Partial<WorkLinks>): WorkLinks =>
	links({
		changes: [row],
		pieceChanges: [
			{ changeId: row.id, pieceId: "piece-1", purpose: "produces" },
		],
		...overrides,
	});

const standings = (work: WorkLinks) =>
	workOf(work, "agent-1").flatMap((held) =>
		held.kind === "piece" ? held.changes.map((c) => c.standing) : [],
	);

// why: where a change stands is the quay's own ladder, read once in the
// domain — a card never ranks checks and reviews a second time.
it("stands a produced change where the quay would put it", () => {
	expect(standings(produced(change({})))).toEqual(["alongside"]);
	expect(standings(produced(change({ checks: "pending" })))).toEqual([
		"checksRunning",
	]);
	expect(standings(produced(change({ mergeable: "conflict" })))).toEqual([
		"needsAttention",
	]);
	expect(standings(produced(change({ draftAt: new Date(0) })))).toEqual([
		"draft",
	]);
});

it("says a landed change landed, and names the repo it lives in", () => {
	const work = workOf(
		produced(change({ landedAt: new Date(0), stage: "landed" })),
		"agent-1",
	);
	expect(work[0]?.kind === "piece" ? work[0].changes : []).toEqual([
		{
			change: expect.objectContaining({
				externalId: "42",
				id: "change-1",
				repoName: "shoals",
				stage: "landed",
			}),
			standing: "landed",
		},
	]);
});

// why: a dismissed change is the one the admiral has already answered for,
// and a change the piece only reviews or waits on is somebody else's work.
it("leaves out dismissed changes and changes the piece did not produce", () => {
	expect(
		standings(
			produced(change({ stage: "withdrawn" }), {
				dismissedChangeIds: new Set(["change-1"]),
			}),
		),
	).toEqual([]);
	expect(standings(produced(change({ stage: "withdrawn" })))).toEqual([
		"needsAttention",
	]);
	expect(
		standings(
			produced(change({}), {
				pieceChanges: [
					{ changeId: "change-1", pieceId: "piece-1", purpose: "reviews" },
				],
			}),
		),
	).toEqual([]);
});

it("offers no piece that has no voyage to be opened in", () => {
	expect(workOf(links({ memberships: [] }), "agent-1")).toEqual([]);
});
