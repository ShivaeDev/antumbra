import type { AgentSummary, SessionSummary } from "@antumbra/contract";

export type Standing =
	| "asleep"
	| "listening"
	| "quiet"
	| "retired"
	| "stranded"
	| "working";

// why: the fleet publishes each Session's presence, so the roster no longer
// has to treat every quiet agent alike — one listening with nothing to do, one
// rested on purpose, and one whose process died mid-turn read the same from
// outside and mean different things to a reader deciding whom to speak to. An
// agent stands at the liveliest of its sessions, because that is where it would
// be found; stranded outranks the quiet ones because it is the one standing
// nobody but the admiral can change.
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
	return sessions.some((session) => session.presence === "asleep")
		? "asleep"
		: "quiet";
};

export const standingOf = (agent: AgentSummary): Standing =>
	agent.status === "alive" ? activityOf(agent.sessions) : "retired";

export const STANDING_LABEL: Readonly<Record<Standing, string>> = {
	asleep: "asleep",
	listening: "listening",
	quiet: "no session",
	retired: "retired",
	stranded: "stranded",
	working: "working",
};

// why: the page answers who is working right now, so the order is the answer:
// the agents taking a turn come first, then the ones whose work stopped without
// finishing and is waiting on a hail, then the ones who would answer at once,
// then the ones who have to be woken, and the ones the admiral has finished
// with come last.
const ORDER: ReadonlyArray<Standing> = [
	"working",
	"stranded",
	"listening",
	"asleep",
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
