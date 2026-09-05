import type { SessionUsage } from "@antumbra/session-event-journal";
import { dayKey } from "#costs/days.ts";
import { countUsage, emptyTally, type Tally, tallyAt } from "#costs/tally.ts";

export interface SpendSession {
	readonly agentId: string;
	readonly backend: string;
}

export interface AgentTally {
	readonly sessionIds: Set<string>;
	readonly tally: Tally;
}

export interface SpendTallies {
	readonly agents: Map<string, AgentTally>;
	readonly days: Map<string, Map<string, Tally>>;
	readonly models: Map<string | null, Tally>;
	readonly overall: Tally;
	readonly unassigned: Tally;
	readonly voyages: Map<string, Tally>;
}

export const emptyTallies = (): SpendTallies => ({
	agents: new Map(),
	days: new Map(),
	models: new Map(),
	overall: emptyTally(),
	unassigned: emptyTally(),
	voyages: new Map(),
});

const agentAt = (agents: Map<string, AgentTally>, agentId: string, sessionId: string): AgentTally => {
	const held = agents.get(agentId) ?? { sessionIds: new Set<string>(), tally: emptyTally() };
	held.sessionIds.add(sessionId);
	agents.set(agentId, held);
	return held;
};

const backendsAt = (days: Map<string, Map<string, Tally>>, day: string): Map<string, Tally> => {
	const held = days.get(day) ?? new Map<string, Tally>();
	days.set(day, held);
	return held;
};

export const countReading = (tallies: SpendTallies, reading: SessionUsage, session: SpendSession, voyageId: string | undefined): void => {
	countUsage(tallies.overall, reading.usage);
	countUsage(agentAt(tallies.agents, session.agentId, reading.sessionId).tally, reading.usage);
	countUsage(voyageId === undefined ? tallies.unassigned : tallyAt(tallies.voyages, voyageId), reading.usage);
	countUsage(tallyAt(tallies.models, reading.usage.model ?? null), reading.usage);
	countUsage(tallyAt(backendsAt(tallies.days, dayKey(reading.at)), session.backend), reading.usage);
};
