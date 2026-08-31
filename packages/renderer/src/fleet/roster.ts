import type { AgentSummary, SessionSummary } from "@antumbra/contract";

export type Standing = "asleep" | "listening" | "quiet" | "retired" | "stranded" | "working";

const activityOf = (sessions: ReadonlyArray<SessionSummary>): Standing => {
	if (sessions.some((session) => session.presence === "working")) {
		return "working";
	}
	if (sessions.some((session) => session.presence === "stranded")) {
		return "stranded";
	}
	if (sessions.some((session) => session.presence === "idle")) {
		return "listening";
	}
	return sessions.some((session) => session.presence === "asleep") ? "asleep" : "quiet";
};

export const standingOf = (agent: AgentSummary): Standing => (agent.status === "alive" ? activityOf(agent.sessions) : "retired");

export const STANDING_LABEL: Readonly<Record<Standing, string>> = {
	asleep: "asleep",
	listening: "listening",
	quiet: "no session",
	retired: "retired",
	stranded: "stranded",
	working: "working",
};

const ORDER: ReadonlyArray<Standing> = ["working", "stranded", "listening", "asleep", "quiet", "retired"];

export interface RosterGroup {
	readonly agents: ReadonlyArray<AgentSummary>;
	readonly standing: Standing;
}

export const rosterGroups = (agents: ReadonlyArray<AgentSummary>): ReadonlyArray<RosterGroup> =>
	ORDER.map((standing) => ({
		agents: agents.filter((agent) => standingOf(agent) === standing),
		standing,
	})).filter((group) => group.agents.length > 0);
