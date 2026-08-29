import {
	berthNaming,
	berthReclaim,
	chartAuthority,
	soundingReading,
} from "#fixtures/ruling.ts";
import type {
	OpenRulingsView,
	RulingView,
	StandingRulingsView,
	StandingRulingView,
} from "#rulings/views.ts";

// why: a request that holds its asker lands ahead of what was already open,
// so the set the admiral meets is reordered rather than appended to.
const courseCall: RulingView = {
	choices: [{ detail: null, id: "choice-3", label: "hold the course" }],
	context:
		"The flagship and the surveyor disagree on which repository the chart lives in.",
	id: "ruling-3",
	question: "Where does the chart belong?",
	radius: "fleet",
	requestedAt: "2026-08-15T10:05:00.000Z",
	requesterAgentId: "agent-1",
	subjects: [{ kind: "tag", label: "charting" }],
	urgency: "blocking",
};

export const urgentRulings: OpenRulingsView = {
	rulings: [courseCall, soundingReading, berthNaming],
};

export const ruledRulings: OpenRulingsView = {
	rulings: [courseCall, berthNaming],
};

// why: the ruling the open script loses is the one the standing script gains,
// and a beat later it takes over the older ruling on the same shoal.
const soundingsRuled: StandingRulingView = {
	answer: "plot against the soundings until the shoal is resurveyed",
	chosen: "trust the soundings",
	id: soundingReading.id,
	question: soundingReading.question,
	radius: soundingReading.radius,
	ruledAt: "2026-08-15T10:12:00.000Z",
	ruledBy: "admiral",
	subjects: soundingReading.subjects,
	urgency: soundingReading.urgency,
};

export const grownStanding: StandingRulingsView = {
	rulings: [soundingsRuled, berthReclaim, chartAuthority],
};

export const supersededStanding: StandingRulingsView = {
	rulings: [soundingsRuled, berthReclaim],
};
