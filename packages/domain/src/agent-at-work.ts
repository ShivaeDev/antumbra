import { executionSessionOfAgent } from "#voyage-execution-selection.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

// why: a spawning Agent owns work before its Session row exists. Once alive,
// only an explicitly idle open Session releases that work; missing or invalid
// Session truth fails closed so a replacement cannot silently fork identity.
export const atWork = (world: VoyageWorld, agentId: string): boolean => {
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
