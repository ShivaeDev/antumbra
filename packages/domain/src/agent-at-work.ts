import { executionSessionOfAgent } from "#voyage-execution-selection.ts";
import type { ExecutionWorld } from "#voyage-rows.ts";

export const atWork = (world: Pick<ExecutionWorld, "agentStatus" | "currentSessionByAgent" | "sessions">, agentId: string): boolean => {
	const status = world.agentStatus.get(agentId);
	if (status === "spawning") {
		return true;
	}
	if (status !== "alive") {
		return false;
	}
	const session = executionSessionOfAgent(world, agentId);
	return session === undefined || session.executionStatus !== "idle";
};

export const agentsAtWork = (world: ExecutionWorld): number => [...world.agentStatus.keys()].filter((agentId) => atWork(world, agentId)).length;
