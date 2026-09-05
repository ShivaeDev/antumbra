import { getSubagentMessages, listSubagents } from "@anthropic-ai/claude-agent-sdk";
import type { AdoptedAgent } from "#workflow-adoption.ts";

export const unrecordedSubagents = async (
	rootRef: string,
	cwd: string,
	recorded: (agentId: string) => boolean,
): Promise<ReadonlyArray<AdoptedAgent>> => {
	const directory = await listSubagents(rootRef, { dir: cwd });
	return Promise.all(
		directory
			.filter((agentId) => !recorded(agentId))
			.map(async (agentId) => ({ agentId, messages: await getSubagentMessages(rootRef, agentId, { dir: cwd }) })),
	);
};
