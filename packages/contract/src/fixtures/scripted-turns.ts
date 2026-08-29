import { fleet } from "#fixtures/fleet.ts";
import {
	chart,
	quayView,
	reefSummary,
	reefView,
	soundings,
} from "#fixtures/voyage.ts";
import type { AgentSummary } from "#fleet.ts";
import type { VoyageSummary } from "#voyage-views.ts";

// why: each of these is one turn of the script — the same reef a beat later,
// written out in full rather than as a patch, so what a view is meant to show
// after an update can be read without replaying how it got there.

const surveyor: AgentSummary = {
	berths: [
		{
			branch: "work/agent-2/eastern-shoal",
			reclaimState: null,
			slug: "eastern-shoal",
			status: "ready",
		},
	],
	canRetire: false,
	charter: "sound the eastern shoal",
	diag: { currentSessionId: "session-2", intents: [] },
	id: "agent-2",
	role: "surveyor",
	sessions: [
		{
			addressable: [],
			backend: "claude",
			canAttachImages: false,
			canInterrupt: true,
			canSend: true,
			canSleep: false,
			cwd: "/tmp/eastern-shoal",
			diag: { current: true, execution: "active", intents: [] },
			presence: "working",
			id: "session-2",
			status: "open",
		},
	],
	status: "alive",
};

export const crewedFleet = { ...fleet, agents: [...fleet.agents, surveyor] };

export const mooredFleet = {
	...crewedFleet,
	repos: [
		...fleet.repos,
		{
			defaultRef: "main",
			id: "repo-2",
			name: "shallows",
			source: "/tmp/shallows",
		},
	],
};

export const answeredReef = {
	...reefView,
	board: [
		...reefView.board,
		{
			authorAgentId: "agent-2",
			body: "the eastern shoal is steeper than charted",
			createdAt: "2026-08-15T09:30:00.000Z",
			id: "entry-2",
			register: "rough" as const,
		},
	],
};

export const workingReef = {
	...answeredReef,
	counts: { active: 2, done: 0, pieces: 2, ready: 0 },
	pieces: [soundings, { ...chart, state: "active" as const }],
};

export const workingSummary = { ...reefSummary, counts: workingReef.counts };

export const shallowsSummary: VoyageSummary = {
	...reefSummary,
	captain: { agentId: "agent-2", atWork: true, status: "alive" },
	counts: { active: 0, done: 0, pieces: 1, ready: 1 },
	focusedAt: null,
	id: "voyage-2",
	kind: "voyage",
	name: "Sound the shallows",
	northStar: "the shallows carry a keel",
	state: "quiet",
};

export const checkingQuay = {
	...quayView,
	rows: quayView.rows.map((row) => ({
		...row,
		change: {
			...row.change,
			checks: "pending" as const,
			review: "pending" as const,
		},
	})),
};

export const landedQuay = {
	...quayView,
	rows: quayView.rows.map((row) => ({
		...row,
		change: { ...row.change, stage: "landed" as const },
	})),
};
