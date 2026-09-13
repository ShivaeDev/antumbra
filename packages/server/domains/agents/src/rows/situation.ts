import type { SessionPresence } from "@antumbra/platform-vocabulary/agent-runtime/session-presence.ts";
import type { AgentStatus } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
import { Schema } from "effect";

export const AGENT_STATES = ["preparing", "working", "waiting", "idle", "asleep", "retired"] as const;
export const AgentStateSchema = Schema.Literals(AGENT_STATES);
export type AgentState = typeof AgentStateSchema.Type;

export interface Situation {
	readonly detail: string | null;
	readonly standing: string;
	readonly state: AgentState;
}

export interface Standing {
	readonly birthDetail: string | null;
	readonly commands: number;
	readonly presence: SessionPresence | null;
	readonly status: AgentStatus;
	readonly subAgents: number;
	readonly toolCalls: number;
}

const STRANDED = "its work was never finished — speak to it to take it back up";

const plainly = (state: AgentState): Situation => ({ detail: null, standing: state, state });

const waitingFor = (count: number, one: string, many: string): Situation => ({
	detail: null,
	standing: count === 1 ? `waiting for a ${one}` : `waiting for ${count} ${many}`,
	state: "waiting",
});

export const situation = (held: Standing): Situation => {
	if (held.status === "spawning") return { detail: held.birthDetail, standing: "preparing", state: "preparing" };
	if (held.status === "retired") return plainly("retired");
	if (held.presence === "stranded") return { detail: STRANDED, standing: "waiting for you", state: "waiting" };
	if (held.status === "dormant" || held.presence === null || held.presence === "ended" || held.presence === "asleep") return plainly("asleep");
	if (held.subAgents > 0) return waitingFor(held.subAgents, "sub-agent", "sub-agents");
	if (held.toolCalls > 0) return waitingFor(held.toolCalls, "tool call", "tool calls");
	if (held.commands > 0) return waitingFor(held.commands, "command", "commands");
	return plainly(held.presence === "working" ? "working" : "idle");
};
