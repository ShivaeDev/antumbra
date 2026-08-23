import { type ChangeRow, changeStatus } from "@antumbra/changes";
import type { ChangeStage } from "@antumbra/plugin-api";
import type { SessionExecutionStatus } from "@antumbra/vocabulary/agent-runtime";
import { expect, it } from "@effect/vitest";
import { pieceOutcomeTally } from "#outcome-status.ts";
import { pieceStates } from "#piece-state.ts";
import type { AgentSessionRow, PieceRow, VoyageWorld } from "#voyage-rows.ts";

const RELEASED = new Date("2026-08-15T09:00:00.000Z");

const piece = (id: string): PieceRow => ({
	charter: `do ${id}`,
	expectation: `${id} is landed`,
	id,
	launchedAt: RELEASED,
	parkedAt: null,
	role: "hand",
	title: id,
});

const change = (id: string, stage: ChangeStage): ChangeRow => ({
	activityAt: RELEASED,
	baseRef: "main",
	body: "",
	checks: "pending",
	draftAt: null,
	externalId: id,
	headRef: `work/${id}`,
	headSha: null,
	host: "scripted",
	id,
	landedAt: stage === "landed" ? RELEASED : null,
	mergeable: "unknown",
	observedAt: RELEASED,
	openedByAgentId: null,
	originSessionId: null,
	preparedHeadRef: null,
	preparedHeadSha: null,
	proposalFrozenAt: null,
	raw: null,
	repoId: "repo-1",
	review: "none",
	stage,
	submissionKey: null,
	title: id,
	url: `https://scripted.test/changes/${id}`,
	withdrawnAt: stage === "withdrawn" ? RELEASED : null,
	workingDiff: null,
	workingTreeStatus: null,
	worktreePath: null,
});

const world = (over: Partial<VoyageWorld>): VoyageWorld => ({
	agentStatus: new Map(),
	currentSessionByAgent: new Map(),
	artifacts: new Map(),
	assignments: [],
	changes: [],
	crews: [],
	dismissedChangeIds: new Set(),
	edges: [],
	memberships: [],
	pieceChanges: [],
	pieceReports: [],
	pieceVerdicts: new Map(),
	pieces: [piece("alpha")],
	reports: new Map(),
	repos: new Map(),
	sessions: [],
	voyages: [],
	...over,
});

const withChanges = (
	stages: ReadonlyArray<ChangeStage>,
	over: Partial<VoyageWorld> = {},
): VoyageWorld =>
	world({
		changes: stages.map((stage, index) => change(`change-${index}`, stage)),
		pieceChanges: stages.map((_, index) => ({
			changeId: `change-${index}`,
			pieceId: "alpha",
			purpose: "produces",
		})),
		...over,
	});

const stateOf = (built: VoyageWorld, pieceId = "alpha") =>
	pieceStates(built).get(pieceId);

const session = (execution: SessionExecutionStatus): AgentSessionRow => ({
	agentId: "agent-1",
	createdAt: RELEASED,
	executionStatus: execution,
	id: "session-1",
	status: "open",
});

const crewing = (
	pieceId: string,
	executionStatus: SessionExecutionStatus,
): Partial<VoyageWorld> => ({
	agentStatus: new Map([["agent-1", "alive"]]),
	assignments: [{ agentId: "agent-1", pieceId }],
	currentSessionByAgent: new Map([["agent-1", "session-1"]]),
	sessions: [session(executionStatus)],
});

const finished = (built: VoyageWorld): VoyageWorld => ({
	...built,
	sessions: [session("idle")],
});

it("a change counts as landed, pending or withdrawn by its stage", () => {
	expect(changeStatus(change("a", "landed"))).toBe("landed");
	expect(changeStatus(change("a", "open"))).toBe("pending");
	expect(changeStatus(change("a", "prepared"))).toBe("pending");
	expect(changeStatus(change("a", "withdrawn"))).toBe("withdrawn");
});

it("a report and an artifact land a piece outright", () => {
	const built = world({
		artifacts: new Map([
			[
				"artifact-1",
				{
					authorAgentId: null,
					basename: "chart.md",
					byteSize: 7,
					digest: "0".repeat(64),
					id: "artifact-1",
					pieceId: "alpha",
					supersededByArtifactId: null,
					title: "chart",
				},
			],
		]),
		pieceReports: [{ pieceId: "alpha", reportId: "report-1" }],
	});
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 2, pending: 0 });
	expect(stateOf(built)).toBe("done");
});

it("a pending change holds a piece short of done, however much else landed", () => {
	const built = withChanges(["open"], {
		pieceReports: [{ pieceId: "alpha", reportId: "report-1" }],
	});
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 1, pending: 1 });
	expect(stateOf(built)).toBe("landing");
});

it("a change alone is enough to hold a piece landing", () => {
	expect(stateOf(withChanges(["open"]))).toBe("landing");
	expect(stateOf(withChanges(["prepared"]))).toBe("landing");
	expect(stateOf(withChanges(["landed", "open"]))).toBe("landing");
});

it("a piece is done when every change of it has landed", () => {
	const built = withChanges(["landed", "landed"]);
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 2, pending: 0 });
	expect(stateOf(built)).toBe("done");
});

it("a withdrawn change with nothing replacing it stops counting at all", () => {
	const built = withChanges(["withdrawn"]);
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 0, pending: 0 });
	expect(stateOf(built)).toBe("ready");
});

it("a withdrawn change counts only while a replacement is under way", () => {
	expect(
		pieceOutcomeTally(withChanges(["withdrawn", "open"]), "alpha"),
	).toEqual({ landed: 0, pending: 2 });
	expect(
		pieceOutcomeTally(withChanges(["withdrawn", "prepared"]), "alpha"),
	).toEqual({ landed: 0, pending: 2 });
	expect(
		pieceOutcomeTally(withChanges(["withdrawn", "landed"]), "alpha"),
	).toEqual({ landed: 1, pending: 0 });
	expect(stateOf(withChanges(["withdrawn", "landed"]))).toBe("done");
});

it("a dismissed change counts for nothing even while a sibling is open", () => {
	const built = withChanges(["withdrawn", "open"], {
		dismissedChangeIds: new Set(["change-0"]),
	});
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 0, pending: 1 });
});

it("a withdrawn change alone leaves a reported piece done rather than landing", () => {
	const reported = withChanges(["withdrawn"], {
		pieceReports: [{ pieceId: "alpha", reportId: "report-1" }],
	});
	expect(pieceOutcomeTally(reported, "alpha")).toEqual({
		landed: 1,
		pending: 0,
	});
	expect(stateOf(reported)).toBe("done");
});

it("a delivered verdict is a landed outcome and the ladder derives done", () => {
	const built = world({ pieceVerdicts: new Map([["alpha", "delivered"]]) });
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 1, pending: 0 });
	expect(stateOf(built)).toBe("done");
});

it("a delivered verdict does not outrank a change still on its way", () => {
	const built = withChanges(["open"], {
		pieceVerdicts: new Map([["alpha", "delivered"]]),
	});
	expect(stateOf(built)).toBe("landing");
});

it("an abandoned piece reads abandoned rather than done", () => {
	const built = world({ pieceVerdicts: new Map([["alpha", "abandoned"]]) });
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 1, pending: 0 });
	expect(stateOf(built)).toBe("abandoned");
});

it("an abandoned piece stops gating what depended on it", () => {
	const built = world({
		changes: [change("change-0", "open")],
		edges: [{ fromPieceId: "bravo", toPieceId: "alpha" }],
		pieceChanges: [
			{ changeId: "change-0", pieceId: "bravo", purpose: "produces" },
		],
		pieceVerdicts: new Map([["bravo", "abandoned"]]),
		pieces: [piece("alpha"), piece("bravo")],
	});
	expect(stateOf(built, "bravo")).toBe("abandoned");
	expect(stateOf(built)).toBe("ready");
});

it("landing sits below blocked and above ready on the ladder", () => {
	const gated = withChanges(["open"], {
		edges: [{ fromPieceId: "bravo", toPieceId: "alpha" }],
		pieces: [piece("alpha"), piece("bravo")],
	});
	expect(stateOf(gated)).toBe("blocked");
});

it("a piece someone is working reads active whatever it is waiting on", () => {
	const worked = withChanges(["open"], {
		agentStatus: new Map([["agent-1", "alive"]]),
		assignments: [{ agentId: "agent-1", pieceId: "alpha" }],
	});
	expect(stateOf(worked)).toBe("active");
});

it("a piece is shipped only when all of its work is done", () => {
	const idle = crewing("alpha", "idle");
	const busy = crewing("alpha", "active");
	expect(stateOf(withChanges(["landed"], idle))).toBe("done");
	expect(stateOf(withChanges(["landed", "open"], idle))).toBe("landing");
	expect(stateOf(withChanges(["landed"], busy))).toBe("active");
	expect(stateOf(withChanges(["landed", "open"], busy))).toBe("active");
});

it("a landed piece reads done while no crew is working it", () => {
	const shipped = withChanges(["landed", "landed"], crewing("alpha", "idle"));
	expect(pieceOutcomeTally(shipped, "alpha")).toEqual({ landed: 2, pending: 0 });
	expect(stateOf(shipped)).toBe("done");
});

it("work asked for again on a landed piece puts it back in progress", () => {
	const redone = withChanges(["landed"], crewing("alpha", "active"));
	expect(pieceOutcomeTally(redone, "alpha")).toEqual({ landed: 1, pending: 0 });
	expect(stateOf(redone)).toBe("active");
});

it("a piece worked again reads done once that crew is finished", () => {
	const redone = withChanges(["landed"], crewing("alpha", "active"));
	expect(stateOf(redone)).toBe("active");
	expect(stateOf(finished(redone))).toBe("done");
});

it("a crew still draining holds a landed piece short of done", () => {
	const draining = crewing("alpha", "draining");
	expect(stateOf(withChanges(["landed"], draining))).toBe("active");
});

it("an abandoned piece stays abandoned while its crew is still working", () => {
	const writtenOff = withChanges(["landed"], {
		...crewing("alpha", "active"),
		pieceVerdicts: new Map([["alpha", "abandoned"]]),
	});
	expect(stateOf(writtenOff)).toBe("abandoned");
	expect(stateOf(finished(writtenOff))).toBe("abandoned");
});

// why: the crew is asked about to decide what a piece reads as, never what may
// sail behind it. Work that landed releases what waited on it whether or not
// the crew that landed it has finished saying so, which is what keeps a chain
// sailing as outcomes land rather than as crews say their goodbyes.
it("a piece worked again still releases what depended on it", () => {
	const built = world({
		...crewing("bravo", "active"),
		changes: [change("change-0", "landed")],
		edges: [{ fromPieceId: "bravo", toPieceId: "alpha" }],
		pieceChanges: [
			{ changeId: "change-0", pieceId: "bravo", purpose: "produces" },
		],
		pieces: [piece("alpha"), piece("bravo")],
	});
	expect(stateOf(built, "bravo")).toBe("active");
	expect(stateOf(built)).toBe("ready");
	expect(stateOf(finished(built), "bravo")).toBe("done");
});
