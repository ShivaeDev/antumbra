import type { OpenRulingsView, RulingView, StandingRulingsView, StandingRulingView } from "#rulings/views.ts";

export const soundingReading: RulingView = {
	choices: [
		{
			detail: "the sounding is a week old and was taken at slack water",
			id: "choice-1",
			label: "trust the soundings",
		},
		{ detail: null, id: "choice-2", label: "trust the chart" },
	],
	context: "The eastern shoal sounds two metres shallower than the chart says, and the next piece plots a course over it.",
	contexts: [
		{
			at: "2026-08-15T09:52:00.000Z",
			author: null,
			body: "How old is the sounding?",
		},
		{
			at: "2026-08-15T09:58:00.000Z",
			author: { id: "agent-2", role: "surveyor" },
			body: "Taken last Tuesday at slack water.",
		},
	],
	declared: { radius: "voyage", urgency: "pressing" },
	gatedPieces: [
		{
			pieceId: "piece-2",
			title: "the chart",
			voyageId: "voyage-1",
			voyageName: "Chart the reef",
		},
	],
	id: "ruling-1",
	parked: null,
	question: "Which reading do we plot the course against?",
	radius: "voyage",
	reclassifications: [
		{
			at: "2026-08-15T09:50:00.000Z",
			by: "captain",
			byAgent: { id: "agent-3", role: "captain" },
			note: "the surveyor cannot plot anything until this lands",
			urgency: "blocking",
		},
	],
	recommendation: { choiceId: "choice-1", reasoning: "a sounding taken this week outranks a chart printed years ago" },
	requestedAt: "2026-08-15T09:40:00.000Z",
	requester: { agent: { id: "agent-2", role: "surveyor" }, kind: "agent" },
	rung: {
		kind: "captain",
		voyageId: "voyage-1",
		voyageName: "Chart the reef",
	},
	subjects: [
		{ id: "voyage-1", kind: "voyage", label: "Chart the reef" },
		{ id: "surveying", kind: "tag", label: "surveying" },
	],
	urgency: "blocking",
	voyage: { id: "voyage-1", name: "Chart the reef" },
};

export const berthNaming: RulingView = {
	choices: [],
	context: "Two repositories name their default branch differently and the berths inherit the disagreement.",
	contexts: [],
	declared: { radius: "fleet", urgency: "eventual" },
	gatedPieces: [],
	id: "ruling-2",
	parked: { at: "2026-08-15T09:00:00.000Z", note: "after the reef is charted" },
	question: "What do we call the branch a berth is cut from?",
	radius: "fleet",
	reclassifications: [],
	recommendation: null,
	requestedAt: "2026-08-15T08:10:00.000Z",
	requester: { agent: { id: "agent-1", role: "navigator" }, kind: "agent" },
	rung: { kind: "flagship" },
	subjects: [{ id: "repo-1", kind: "repo", label: "shoals" }],
	urgency: "eventual",
	voyage: null,
};

export const openRulings: OpenRulingsView = {
	rulings: [soundingReading, berthNaming],
};

export const berthReclaim: StandingRulingView = {
	answer: "a berth is reclaimed only once its branch is pushed",
	chosen: null,
	id: "ruling-10",
	question: "When may a berth be reclaimed?",
	radius: "fleet",
	ruledAt: "2026-08-14T16:20:00.000Z",
	ruledBy: "admiral",
	ruledByAgent: null,
	stale: false,
	subjects: [],
	urgency: "pressing",
};

export const chartAuthority: StandingRulingView = {
	answer: "the surveyed depth wins over the printed one",
	chosen: "trust the soundings",
	id: "ruling-11",
	question: "Which depth is charted when survey and chart disagree?",
	radius: "voyage",
	ruledAt: "2026-08-13T11:00:00.000Z",
	ruledBy: "captain",
	ruledByAgent: { id: "agent-3", role: "captain" },
	stale: false,
	subjects: [{ id: "voyage-1", kind: "voyage", label: "Chart the reef" }],
	urgency: "blocking",
};

export const standingRulings: StandingRulingsView = {
	rulings: [berthReclaim, chartAuthority],
};
