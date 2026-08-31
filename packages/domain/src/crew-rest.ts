import { sessionAtRest, sessionRetirable } from "@antumbra/sessions";
import { sessionPresence } from "@antumbra/vocabulary/agent-runtime";
import type { PieceView } from "#piece-view.ts";
import type { AgentSessionRow, VoyageWorld } from "#voyage-rows.ts";

export interface CrewRuntime {
	readonly attached: ReadonlySet<string>;
	readonly delegating: ReadonlySet<string>;
}

const openRootsOf = (world: VoyageWorld, agentId: string): ReadonlyArray<AgentSessionRow> =>
	world.sessions.filter((session) => session.agentId === agentId && session.status === "open");

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

export const restingCrew = (world: VoyageWorld, runtime: CrewRuntime): ReadonlyMap<string, ReadonlyArray<string>> =>
	new Map(
		[...world.agentStatus].flatMap(([agentId, status]) => {
			const roots = openRootsOf(world, agentId);
			return status === "alive" && roots.length > 0 && roots.every((session) => restful(runtime, session))
				? [[agentId, roots.map((session) => session.id)] as const]
				: [];
		}),
	);

export const retirableCrew = (world: VoyageWorld, runtime: CrewRuntime): ReadonlySet<string> =>
	new Set(
		[...world.agentStatus].flatMap(([agentId, status]) =>
			status === "alive" && openRootsOf(world, agentId).every((session) => !working(runtime, session)) ? [agentId] : [],
		),
	);

export const crewReleasable = (piece: PieceView, resting: ReadonlyMap<string, ReadonlyArray<string>>): boolean => {
	const crew = piece.agents.filter((agent) => agent.status === "alive");
	return piece.state === "done" && crew.length > 0 && crew.every((agent) => resting.has(agent.agentId));
};

export const claimedCrew = (world: VoyageWorld, pieceId: string): ReadonlyArray<string> =>
	world.assignments.filter((assignment) => assignment.pieceId === pieceId).map((assignment) => assignment.agentId);
