import type { agent } from "@antumbra/domain-agents/rows/agent.ts";
import type { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { DueWake } from "@antumbra/domain-mail/queries/due-wakes.ts";
import type { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { Schema } from "effect";

export const Waiting = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	voyage: Schema.NullOr(Schema.String),
	mail: Schema.NullOr(DueWake.fields.batch),
	waitedMillis: Schema.NullOr(Schema.Number),
});

type Agent = typeof agent.Row.Type;
type Voyage = typeof voyage.Row.Type;

export interface Crew {
	readonly owners: ReadonlyMap<string, Agent>;
	readonly voyages: ReadonlyMap<string, Voyage>;
}

export const crewOf = (agents: ReadonlyArray<Agent>, links: ReadonlyArray<typeof voyageAgent.Row.Type>, voyages: ReadonlyArray<Voyage>): Crew => {
	const owners = new Map<string, Agent>();
	for (const held of agents) {
		if (held.currentSessionId !== null) owners.set(held.currentSessionId, held);
	}
	const sailed = new Map<string, Voyage>();
	for (const link of links) {
		const found = voyages.find((held) => held.id === link.voyageId);
		if (found !== undefined) sailed.set(String(link.agentId), found);
	}
	return { owners, voyages: sailed };
};

export const crewVoyage = (crew: Crew, sessionId: string): Voyage | null => {
	const owner = crew.owners.get(sessionId);
	return owner === undefined ? null : (crew.voyages.get(owner.id) ?? null);
};

export const waitingSession = (crew: Crew, sessionId: string, id: string, waitedMillis: number | null): typeof Waiting.Type => ({
	id,
	title: crew.owners.get(sessionId)?.role ?? sessionId,
	voyage: crewVoyage(crew, sessionId)?.name ?? null,
	mail: null,
	waitedMillis,
});

export const voyageName = (voyages: ReadonlyArray<Voyage>, voyageId: string | null): string | null =>
	voyages.find((held) => held.id === voyageId)?.name ?? null;
