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

// why: the provider's own census of a session's delegated agents is read from
// its stored transcripts because the live mirror may have dropped a batch.
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
		return { agents: [], failure: String(error) };
	}
};
