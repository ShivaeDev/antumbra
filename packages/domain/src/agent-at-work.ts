import { executionSessionOfAgent } from "#voyage-execution-selection.ts";
import type { AgentExecutionWorld } from "#voyage-rows.ts";

export const atWork = (world: AgentExecutionWorld, agentId: string): boolean => {
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

export const agentsAtWork = (world: AgentExecutionWorld): number => [...world.agentStatus.keys()].filter((agentId) => atWork(world, agentId)).length;
