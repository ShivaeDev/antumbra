import { sessionAtRest, sessionRetirable } from "@antumbra/sessions";
import { sessionPresence } from "@antumbra/vocabulary/agent-runtime";
import type { PieceView } from "#piece-view.ts";
import type { AgentSessionRow, RetirementWorld } from "#voyage-rows.ts";

export interface CrewRuntime {
	readonly attached: ReadonlySet<string>;
	readonly delegating: ReadonlySet<string>;
}

const restful = (runtime: CrewRuntime, session: AgentSessionRow): boolean =>
	sessionAtRest({
		delegating: runtime.delegating.has(session.id),
		presence: sessionPresence({
			attached: runtime.attached.has(session.id),
			executionStatus: session.executionStatus,
			open: true,
		}),
	});

const working = (runtime: CrewRuntime, session: AgentSessionRow): boolean =>
	!sessionRetirable(
		sessionPresence({
			attached: runtime.attached.has(session.id),
			executionStatus: session.executionStatus,
			open: true,
		}),
	);

export const crewRest = (world: RetirementWorld, runtime: CrewRuntime) => {
	const resting = new Map<string, ReadonlyArray<string>>();
	const retirable = new Set<string>();
	const alive = new Set([...world.agentStatus].flatMap(([agentId, status]) => (status === "alive" ? [agentId] : [])));
	if (alive.size === 0) return { resting, retirable };
	const roots = Map.groupBy(
		world.sessions.filter((session) => alive.has(session.agentId) && session.status === "open"),
		(session) => session.agentId,
	);
	for (const agentId of alive) {
		const sessions = roots.get(agentId) ?? [];
		if (sessions.length > 0 && sessions.every((session) => restful(runtime, session))) {
			resting.set(
				agentId,
				sessions.map((session) => session.id),
			);
		}
		if (sessions.every((session) => !working(runtime, session))) {
			retirable.add(agentId);
		}
	}
	return { resting, retirable };
};

export const crewReleasable = (piece: PieceView, resting: ReadonlyMap<string, ReadonlyArray<string>>): boolean => {
	const crew = piece.agents.filter((agent) => agent.status === "alive");
	return piece.state === "done" && crew.length > 0 && crew.every((agent) => resting.has(agent.agentId));
};
