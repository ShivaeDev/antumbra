import type { AgentSpend, BackendSpend, CostsView, DaySpend, ModelSpend, VoyageSpend } from "@antumbra/contract";
import type { SessionUsage } from "@antumbra/session-event-journal";
import { countReading, emptyTallies, type SpendSession, type SpendTallies } from "#costs/buckets.ts";
import { windowDays } from "#costs/days.ts";
import { type Tally, totalOf } from "#costs/tally.ts";

export const COST_WINDOW_DAYS = 30;

export interface SpendWorld {
	readonly now: Date;
	readonly readings: ReadonlyArray<SessionUsage>;
	readonly sessions: ReadonlyMap<string, SpendSession>;
	readonly voyageNames: ReadonlyMap<string, string>;
	readonly voyageOfAgent: ReadonlyMap<string, string>;
}

const gather = (world: SpendWorld): SpendTallies => {
	const tallies = emptyTallies();
	for (const reading of world.readings) {
		const session = world.sessions.get(reading.sessionId);
		if (session !== undefined) {
			countReading(tallies, reading, session, world.voyageOfAgent.get(session.agentId));
		}
	}
	return tallies;
};

const backendsOf = (spent: Map<string, Tally> | undefined): ReadonlyArray<BackendSpend> =>
	[...(spent ?? new Map<string, Tally>())]
		.map(([backend, tally]) => ({ backend, total: totalOf(tally) }) satisfies BackendSpend)
		.toSorted((left, right) => left.backend.localeCompare(right.backend));

const agentsOf = (tallies: SpendTallies): ReadonlyArray<AgentSpend> =>
	[...tallies.agents].map(([agentId, held]) => ({ agentId, sessionIds: [...held.sessionIds], total: totalOf(held.tally) }) satisfies AgentSpend);

const daysOf = (tallies: SpendTallies, now: Date): ReadonlyArray<DaySpend> =>
	windowDays(now, COST_WINDOW_DAYS).map((day) => ({ backends: backendsOf(tallies.days.get(day)), day }) satisfies DaySpend);

const modelsOf = (tallies: SpendTallies): ReadonlyArray<ModelSpend> =>
	[...tallies.models].map(([model, tally]) => ({ model, total: totalOf(tally) }) satisfies ModelSpend);

const voyagesOf = (tallies: SpendTallies, names: ReadonlyMap<string, string>): ReadonlyArray<VoyageSpend> =>
	[...tallies.voyages].flatMap(([voyageId, tally]) => {
		const name = names.get(voyageId);
		return name === undefined ? [] : [{ name, total: totalOf(tally), voyageId } satisfies VoyageSpend];
	});

export const costsView = (world: SpendWorld): CostsView => {
	const tallies = gather(world);
	return {
		agents: agentsOf(tallies),
		days: daysOf(tallies, world.now),
		models: modelsOf(tallies),
		total: totalOf(tallies.overall),
		unassigned: totalOf(tallies.unassigned),
		voyages: voyagesOf(tallies, world.voyageNames),
	};
};
