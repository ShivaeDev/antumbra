import type { ChangeRow } from "@antumbra/changes";
import type { ChangeStage } from "@antumbra/plugin-api";
import type { SessionExecutionStatus } from "@antumbra/vocabulary/agent-runtime";
import { pieceStates } from "#piece-state.ts";
import type { VoyageDetailRows } from "#voyage/detail/rows.ts";
import type { AgentSessionRow, PieceRow } from "#voyage-rows.ts";

export const RELEASED = new Date("2026-08-15T09:00:00.000Z");

export const piece = (id: string): PieceRow => ({
	charter: `do ${id}`,
	expectation: `${id} is landed`,
	id,
	launchedAt: RELEASED,
	parkedAt: null,
	role: "hand",
	title: id,
});

export const change = (id: string, stage: ChangeStage): ChangeRow => ({
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

export const world = (over: Partial<VoyageDetailRows>): VoyageDetailRows => ({
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
	rulingGates: [],
	pieces: [piece("alpha")],
	reports: new Map(),
	roleSettings: new Map(),
	repos: new Map(),
	sessions: [],
	...over,
});

export const withChanges = (stages: ReadonlyArray<ChangeStage>, over: Partial<VoyageDetailRows> = {}): VoyageDetailRows =>
	world({
		changes: stages.map((stage, index) => change(`change-${index}`, stage)),
		pieceChanges: stages.map((_, index) => ({
			changeId: `change-${index}`,
			pieceId: "alpha",
			purpose: "produces",
		})),
		...over,
	});

export const stateOf = (built: VoyageDetailRows, pieceId = "alpha") => pieceStates(built).get(pieceId);

export const session = (execution: SessionExecutionStatus): AgentSessionRow => ({
	agentId: "agent-1",
	backend: "scripted",
	createdAt: RELEASED,
	executionStatus: execution,
	id: "session-1",
	status: "open",
});

export const crewing = (pieceId: string, executionStatus: SessionExecutionStatus): Partial<VoyageDetailRows> => ({
	agentStatus: new Map([["agent-1", "alive"]]),
	assignments: [{ agentId: "agent-1", pieceId }],
	currentSessionByAgent: new Map([["agent-1", "session-1"]]),
	sessions: [session(executionStatus)],
});

export const finished = (built: VoyageDetailRows): VoyageDetailRows => ({
	...built,
	sessions: [session("idle")],
});
