import type { SessionPresence } from "@antumbra/platform-vocabulary/agent-runtime/session-presence.ts";
import type { AgentStatus } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
export const situation = (status: AgentStatus, presence: SessionPresence | null): string => {
	if (status === "spawning") return "Preparing to work";
	if (status === "retired") return "Retired";
	if (status === "dormant") return "Dormant";
	if (presence === null || presence === "ended") return "No open conversation";
	const words = { working: "Working", idle: "Idle", asleep: "Asleep", stranded: "Stranded" };
	return words[presence];
};
