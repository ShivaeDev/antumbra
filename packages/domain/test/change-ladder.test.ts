import type { ChangeStage } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import type { ChangeRow } from "#change-rows.ts";
import { changeStatus, pieceOutcomeTally } from "#outcome-status.ts";
import { pieceStates } from "#piece-state.ts";
import type { PieceRow, VoyageWorld } from "#voyage-rows.ts";

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
	raw: null,
	repoId: "repo-1",
	review: "none",
	stage,
	title: id,
	url: `https://scripted.test/changes/${id}`,
	withdrawnAt: stage === "withdrawn" ? RELEASED : null,
});

const world = (over: Partial<VoyageWorld>): VoyageWorld => ({
	agentStatus: new Map(),
	artifacts: new Map(),
	assignments: [],
	changes: [],
	crews: [],
	edges: [],
	memberships: [],
	pieceArtifacts: [],
	pieceChanges: [],
	pieceReports: [],
	pieces: [piece("alpha")],
	reports: new Map(),
	repos: new Map(),
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
		})),
		...over,
	});

const stateOf = (built: VoyageWorld, pieceId = "alpha") =>
	pieceStates(built).get(pieceId);

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
					id: "artifact-1",
					title: "chart",
					uri: "/chart.svg",
				},
			],
		]),
		pieceArtifacts: [{ artifactId: "artifact-1", pieceId: "alpha" }],
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

// why: a withdrawn change is neither landed nor pending — nothing came of it,
// so the piece is back where it started rather than finished or waiting.
it("a withdrawn change leaves the piece neither done nor landing", () => {
	const built = withChanges(["withdrawn"]);
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 0, pending: 0 });
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
