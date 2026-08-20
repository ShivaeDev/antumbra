import type { AgentSummary, SessionSummary } from "@antumbra/contract";

export type Standing = "quiet" | "retired" | "waiting" | "working";

// why: the fleet publishes capabilities, not Session execution state, so the
// roster says what the admiral may do to an agent right now — a session that
// can be interrupted is one taking a turn — and never claims to know whether a
// quiet session is idle or winding down.
const activityOf = (sessions: ReadonlyArray<SessionSummary>): Standing => {
	if (sessions.some((session) => session.canInterrupt)) {
		return "working";
	}
	if (sessions.some((session) => session.status === "open")) {
		return "waiting";
	}
	return "quiet";
};

export const standingOf = (agent: AgentSummary): Standing =>
	agent.status === "alive" ? activityOf(agent.sessions) : "retired";

export const STANDING_LABEL: Readonly<Record<Standing, string>> = {
	quiet: "no session",
	retired: "retired",
	waiting: "waiting",
	working: "working",
};

// why: the page answers who is working right now, so the order is the answer:
// the agents taking a turn come first and the ones the admiral has finished
// with come last.
const ORDER: ReadonlyArray<Standing> = [
	"working",
	"waiting",
	"quiet",
	"retired",
];

export interface RosterGroup {
	readonly agents: ReadonlyArray<AgentSummary>;
	readonly standing: Standing;
}

export const rosterGroups = (
	agents: ReadonlyArray<AgentSummary>,
): ReadonlyArray<RosterGroup> =>
	ORDER.map((standing) => ({
		agents: agents.filter((agent) => standingOf(agent) === standing),
		standing,
	})).filter((group) => group.agents.length > 0);
