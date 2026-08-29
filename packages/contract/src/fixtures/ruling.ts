import type {
	OpenRulingsView,
	RulingView,
	StandingRulingsView,
	StandingRulingView,
} from "#rulings/views.ts";

export const soundingReading: RulingView = {
	choices: [
		{
			detail: "the sounding is a week old and was taken at slack water",
			id: "choice-1",
			label: "trust the soundings",
		},
		{ detail: null, id: "choice-2", label: "trust the chart" },
	],
	context:
		"The eastern shoal sounds two metres shallower than the chart says, and the next piece plots a course over it.",
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
	question: "Which reading do we plot the course against?",
	radius: "voyage",
	reclassifications: [
		{
			at: "2026-08-15T09:50:00.000Z",
			by: "admiral",
			note: "the surveyor cannot plot anything until this lands",
			urgency: "blocking",
		},
	],
	requestedAt: "2026-08-15T09:40:00.000Z",
	requesterAgentId: "agent-2",
	subjects: [
		{ kind: "voyage", label: "voyage-1" },
		{ kind: "tag", label: "surveying" },
	],
	urgency: "blocking",
};

export const berthNaming: RulingView = {
	choices: [],
	context:
		"Two repositories name their default branch differently and the berths inherit the disagreement.",
	declared: { radius: "fleet", urgency: "eventual" },
	gatedPieces: [],
	id: "ruling-2",
	question: "What do we call the branch a berth is cut from?",
	radius: "fleet",
	reclassifications: [],
	requestedAt: "2026-08-15T08:10:00.000Z",
	requesterAgentId: "agent-1",
	subjects: [{ kind: "repo", label: "repo-1" }],
	urgency: "eventual",
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
	ruledBy: "admiral",
	subjects: [{ kind: "voyage", label: "voyage-1" }],
	urgency: "blocking",
};

export const standingRulings: StandingRulingsView = {
	rulings: [berthReclaim, chartAuthority],
};
