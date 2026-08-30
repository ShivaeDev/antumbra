import type { ChangeRow } from "@antumbra/changes";
import { expect, it } from "@effect/vitest";
import { type ChangeLinks, situationsByAgent } from "#situations.ts";

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

const links = (
	row: ChangeRow,
	overrides?: Partial<ChangeLinks>,
): ChangeLinks => ({
	assignments: [{ agentId: "agent-1", pieceId: "piece-1" }],
	changes: [row],
	pieceChanges: [{ changeId: row.id, pieceId: "piece-1", purpose: "produces" }],
	...overrides,
});

const situationsOf = (row: ChangeRow, overrides?: Partial<ChangeLinks>) =>
	situationsByAgent(links(row, overrides), ["agent-1"]).get("agent-1") ?? [];

const kinds = (row: ChangeRow, overrides?: Partial<ChangeLinks>) =>
	situationsOf(row, overrides).map((entry) => entry.situation);

it("a change the record says is well is addressable for nothing", () => {
	expect(situationsOf(change({}))).toEqual([]);
});

it("each situation appears only when its own fact is on the record", () => {
	expect(kinds(change({ mergeable: "conflict" }))).toEqual(["merge_conflicts"]);
	expect(kinds(change({ checks: "red" }))).toEqual(["checks_failed"]);
	expect(kinds(change({ review: "changes_requested" }))).toEqual([
		"unresolved_reviews",
	]);
});

it("a change in trouble three ways offers all three, each naming it", () => {
	const troubled = change({
		checks: "red",
		mergeable: "conflict",
		review: "changes_requested",
	});
	expect(kinds(troubled)).toEqual([
		"merge_conflicts",
		"checks_failed",
		"unresolved_reviews",
	]);
	for (const entry of situationsOf(troubled)) {
		expect(entry.changeId).toBe("change-1");
		expect(entry.reference).toBe("#42");
	}
});

it("a change the host is not presenting is addressable for nothing", () => {
	expect(
		situationsOf(change({ mergeable: "conflict", stage: "landed" })),
	).toEqual([]);
	expect(
		situationsOf(change({ externalId: null, mergeable: "conflict" })),
	).toEqual([]);
});

// why: the agent that produced a change is the hand that fixes it. One that
// reviews it, or waits on it, would be sent at somebody else's branch.
it("only the piece that produces a change carries its situations", () => {
	const conflicted = change({ mergeable: "conflict" });
	expect(
		situationsOf(conflicted, {
			pieceChanges: [
				{ changeId: "change-1", pieceId: "piece-1", purpose: "reviews" },
			],
		}),
	).toEqual([]);
});

it("an agent assigned to nothing carries no situations", () => {
	expect(
		situationsByAgent(links(change({ mergeable: "conflict" })), [
			"agent-2",
		]).get("agent-2"),
	).toEqual([]);
});
