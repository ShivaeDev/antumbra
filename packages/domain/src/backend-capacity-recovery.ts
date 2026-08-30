import { Database } from "@antumbra/persistence";
import type { AgentBackend, BackendCapacityObservation } from "@antumbra/plugin-api";
import { projectHistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Option } from "effect";
import { ignoreCapacityObservation } from "#backend-capacity-write.ts";

interface HistoricalBackendCapacity {
	readonly backend: string;
	readonly observation: Option.Option<BackendCapacityObservation>;
}

const observationFor = (
	backend: string,
	registered: AgentBackend,
	backendBySession: ReadonlyMap<string, string>,
	events: ReadonlyArray<{
		readonly at: Date;
		readonly kind: string;
		readonly payload: string;
		readonly seq: number;
		readonly sessionId: string;
	}>,
): Option.Option<BackendCapacityObservation> => {
	let observation = Option.none<BackendCapacityObservation>();
	for (const row of events) {
		if (backendBySession.get(row.sessionId) !== backend) {
			continue;
		}
		const historical = projectHistoricalAgentEvent(row.kind, row.payload);
		if (historical._tag !== "Known") {
			continue;
		}
		const classified = registered.capacity?.classify(historical.event.raw);
		if (classified !== undefined && Option.isSome(classified)) {
			const candidate = {
				...classified.value,
				observedAt: row.at.getTime(),
			} satisfies BackendCapacityObservation;
			const prior = Option.map(observation, (reading) => ({
				observedAt: new Date(reading.observedAt),
				status: reading.status,
			}));
			if (!ignoreCapacityObservation(prior, candidate)) {
				observation = Option.some(candidate);
			}
		}
	}
	return observation;
};

// why: this is a one-time bridge for records written before capacity had its
// own durable row. Once a backend has a row, replaying its journal after an
// admiral clear would turn old evidence into a new rejection. Folding first
// preserves the hard-block latch while writing only the final reading.
export const recoverBackendCapacities = (backends: ReadonlyMap<string, AgentBackend>, storedBackends: ReadonlySet<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const pending = [...backends].filter(([backend, registered]) => registered.capacity !== undefined && !storedBackends.has(backend));
		if (pending.length === 0) {
			return [];
		}
		const sessions = yield* db.AgentSession.all();
		const backendBySession = new Map(sessions.map((session) => [session.id, session.backend] as const));
		const events = (yield* db.SessionEvent.all()).toSorted(
			(left, right) => left.at.getTime() - right.at.getTime() || left.sessionId.localeCompare(right.sessionId) || left.seq - right.seq,
		);
		return pending.map(
			([backend, registered]): HistoricalBackendCapacity => ({
				backend,
				observation: observationFor(backend, registered, backendBySession, events),
			}),
		);
	});
