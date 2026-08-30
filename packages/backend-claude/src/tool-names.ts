import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { TOOL_SERVER_NAME } from "#adapters/tool-server.ts";

type Started = Extract<AgentEvent, { type: "tool.started" }>;
type ToolIdentity = Pick<Started, "name" | "providerName" | "servedBy">;

export const toolIdentity = (wireName: string): ToolIdentity => {
	const match = /^mcp__(.+?)__(.+)$/.exec(wireName);
	if (match === null) {
		return { name: wireName };
	}
	const server = match[1];
	const tool = match[2];
	if (server === undefined || tool === undefined) {
		return { name: wireName };
	}
	return server === TOOL_SERVER_NAME
		? { name: tool, providerName: wireName, servedBy: "antumbra" }
		: { name: `${server}: ${tool}`, providerName: wireName };
};
