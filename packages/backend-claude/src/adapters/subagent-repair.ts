import { getSubagentMessages, listSubagents } from "@anthropic-ai/claude-agent-sdk";
import type { AdoptedAgent, Repair } from "#workflow-adoption.ts";

export interface RepairRequest {
	readonly cwd: string;
	readonly nativeSessionId: string;
	readonly recorded: (agentId: string) => boolean;
}

const read = async (request: RepairRequest, agentId: string): Promise<AdoptedAgent> => ({
	agentId,
	messages: await getSubagentMessages(request.nativeSessionId, agentId, {
		dir: request.cwd,
	}),
});

// why: the provider's own census of a session's delegated agents, read from
// where it stores them rather than from the mirror that may have dropped a
// batch. Only agents this Session never recorded are read back: the rest are
// already in the log, and re-reading them would write every word twice.
export const repairSubagents = async (request: RepairRequest): Promise<Repair> => {
	try {
		const census = await listSubagents(request.nativeSessionId, {
			dir: request.cwd,
		});
		const missing = census.filter((agentId) => !request.recorded(agentId));
		return {
			agents: await Promise.all(missing.map((id) => read(request, id))),
			failure: undefined,
		};
	} catch (error) {
		// why: a repair that cannot run leaves the live record standing, so it is
		// never fatal — but it is a hole, and the caller writes it down rather
		// than letting the session end looking complete.
		return { agents: [], failure: String(error) };
	}
};
