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
	declared: { radius: "fleet", urgency: "blocking" },
	gatedPieces: [],
	id: "ruling-3",
	question: "Where does the chart belong?",
	radius: "fleet",
	reclassifications: [],
	requestedAt: "2026-08-15T10:05:00.000Z",
	requester: { agentId: "agent-1", kind: "agent" },
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
	stale: false,
	subjects: soundingReading.subjects,
	urgency: soundingReading.urgency,
};

// why: a proclamation is asked and answered in one act, so it never passes
// through the open set — it appears among what stands the moment it lands.
const dredgingProclaimed: StandingRulingView = {
	answer: "no voyage dredges a channel it did not survey first",
	chosen: null,
	id: "ruling-12",
	question: "May a voyage dredge a channel?",
	radius: "fleet",
	ruledAt: "2026-08-15T10:20:00.000Z",
	ruledBy: "admiral",
	stale: false,
	subjects: [{ kind: "tag", label: "dredging" }],
	urgency: "eventual",
};

export const grownStanding: StandingRulingsView = {
	rulings: [soundingsRuled, berthReclaim, chartAuthority],
};

export const supersededStanding: StandingRulingsView = {
	rulings: [soundingsRuled, berthReclaim],
};

export const proclaimedStanding: StandingRulingsView = {
	rulings: [dredgingProclaimed, soundingsRuled, berthReclaim],
};

// why: the reef the soundings ruling was written for finishes, so the ruling
// reads stale without leaving the standing set — it binds every agent it named
// until the admiral withdraws it.
const soundingsStale: StandingRulingView = { ...soundingsRuled, stale: true };

export const staleStanding: StandingRulingsView = {
	rulings: [dredgingProclaimed, soundingsStale, berthReclaim],
};

export const withdrawnStanding: StandingRulingsView = {
	rulings: [dredgingProclaimed, berthReclaim],
};
