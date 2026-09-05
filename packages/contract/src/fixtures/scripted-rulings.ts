import { berthNaming, berthReclaim, chartAuthority, soundingReading } from "#fixtures/ruling.ts";
import type { OpenRulingsView, RulingView, StandingRulingsView, StandingRulingView } from "#rulings/views.ts";

const courseCall: RulingView = {
	choices: [{ detail: null, id: "choice-3", label: "hold the course" }],
	context: "The flagship and the surveyor disagree on which repository the chart lives in.",
	contexts: [],
	declared: { radius: "fleet", urgency: "blocking" },
	gatedPieces: [],
	id: "ruling-3",
	parked: null,
	question: "Where does the chart belong?",
	radius: "fleet",
	reclassifications: [
		{
			at: "2026-08-15T10:07:00.000Z",
			by: "flagship",
			byAgentId: "agent-4",
			note: "both repositories are the admiral's to name; I have nothing to add",
		},
	],
	requestedAt: "2026-08-15T10:05:00.000Z",
	requester: { agentId: "agent-1", kind: "agent" },
	rung: { kind: "admiral" },
	subjects: [{ kind: "tag", label: "charting" }],
	urgency: "blocking",
};

export const urgentRulings: OpenRulingsView = {
	rulings: [courseCall, soundingReading, berthNaming],
};

export const ruledRulings: OpenRulingsView = {
	rulings: [courseCall, berthNaming],
};

const soundingsRuled: StandingRulingView = {
	answer: "plot against the soundings until the shoal is resurveyed",
	chosen: "trust the soundings",
	id: soundingReading.id,
	question: soundingReading.question,
	radius: soundingReading.radius,
	ruledAt: "2026-08-15T10:12:00.000Z",
	ruledBy: "admiral",
	ruledByAgentId: null,
	stale: false,
	subjects: soundingReading.subjects,
	urgency: soundingReading.urgency,
};

const dredgingProclaimed: StandingRulingView = {
	answer: "no voyage dredges a channel it did not survey first",
	chosen: null,
	id: "ruling-12",
	question: "May a voyage dredge a channel?",
	radius: "fleet",
	ruledAt: "2026-08-15T10:20:00.000Z",
	ruledBy: "admiral",
	ruledByAgentId: null,
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

const soundingsStale: StandingRulingView = { ...soundingsRuled, stale: true };

export const staleStanding: StandingRulingsView = {
	rulings: [dredgingProclaimed, soundingsStale, berthReclaim],
};

export const withdrawnStanding: StandingRulingsView = {
	rulings: [dredgingProclaimed, berthReclaim],
};
