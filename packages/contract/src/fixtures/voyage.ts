import type { QuayView } from "#quay-views.ts";
import type {
	ChangeView,
	PieceView,
	VoyageSummary,
	VoyageView,
} from "#voyage-views.ts";

export const shoalWarning: ChangeView = {
	activityAt: "2026-08-15T09:20:00.000Z",
	checks: "green",
	externalId: "41",
	host: "github",
	id: "change-1",
	isDraft: false,
	mergeable: "clean",
	observedAt: "2026-08-15T09:22:00.000Z",
	repoId: "repo-1",
	repoName: "shoals",
	review: "approved",
	stage: "open",
	title: "warn on the northern shoal",
	url: "https://github.test/shoals/pull/41",
};

export const soundings: PieceView = {
	agents: [{ agentId: "agent-2", status: "alive" }],
	artifactHistory: [],
	artifacts: [],
	board: [
		{
			authorAgentId: "agent-2",
			body: "## Latest sounding\n\nThe northern edge is **shallow**.",
			createdAt: "2026-08-15T09:12:00.000Z",
			id: "entry-piece-1",
			register: "smooth",
		},
	],
	changes: [shoalWarning],
	charter: "sound the northern shoals",
	dependsOn: [],
	expectation: "the depths are recorded",
	id: "piece-1",
	launchedAt: "2026-08-15T09:05:00.000Z",
	parkedAt: null,
	reports: [],
	role: "hand",
	state: "active",
	title: "soundings",
};

export const chart: PieceView = {
	agents: [],
	artifactHistory: [],
	artifacts: [],
	board: [],
	changes: [],
	charter: "draw the chart from the soundings",
	dependsOn: ["piece-1"],
	expectation: "a chart exists",
	id: "piece-2",
	launchedAt: null,
	parkedAt: null,
	reports: [],
	role: "cartographer",
	state: "held",
	title: "the chart",
};

export const reefSummary: VoyageSummary = {
	backend: "claude",
	captain: { agentId: "agent-1", atWork: true, status: "alive" },
	counts: { active: 1, done: 0, pieces: 2, ready: 0 },
	focusedAt: "2026-08-15T09:00:00.000Z",
	id: "voyage-1",
	name: "Chart the reef",
	northStar: "every shoal is known",
	state: "underWay",
};

export const reefView: VoyageView = {
	...reefSummary,
	board: [
		{
			authorAgentId: null,
			body: "the reef shifts after a storm",
			createdAt: "2026-08-15T09:10:00.000Z",
			id: "entry-1",
			register: "smooth",
		},
	],
	context: "the reef is uncharted",
	crew: [{ agentId: "agent-1", role: "captain", status: "alive" }],
	pieces: [soundings, chart],
};

export const quayView: QuayView = {
	hosts: [{ available: true, detail: "signed in as navigator", tag: "github" }],
	pieces: [
		{ id: "piece-1", title: "soundings", voyageName: "Chart the reef" },
		{ id: "piece-2", title: "the chart", voyageName: "Chart the reef" },
	],
	rows: [
		{
			baseRef: "main",
			body: "Warn navigators before the northern shoal catches another keel.",
			change: shoalWarning,
			group: "alongside",
			headRef: "work/agent-1/reef",
			headSha: "0123456789abcdef0123456789abcdef01234567",
			originSessionId: "session-1",
			pieceId: "piece-1",
			pieceTitle: "soundings",
			voyageId: "voyage-1",
			voyageName: "Chart the reef",
		},
	],
};
