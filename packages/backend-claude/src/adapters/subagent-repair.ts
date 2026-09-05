import { unrecordedSubagents } from "#adapters/unrecorded-subagents.ts";
import type { Repair } from "#workflow-adoption.ts";

interface RepairRequest {
	readonly cwd: string;
	readonly nativeSessionId: string;
	readonly recorded: (agentId: string) => boolean;
}

export const repairSubagents = async (request: RepairRequest): Promise<Repair> => {
	try {
		return {
			agents: await unrecordedSubagents(request.nativeSessionId, request.cwd, request.recorded),
			failure: undefined,
		};
	} catch (error) {
		return { agents: [], failure: String(error) };
	}
};
