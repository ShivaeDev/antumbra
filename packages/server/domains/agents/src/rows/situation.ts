import type { SessionPresence } from "@antumbra/platform-vocabulary/agent-runtime/session-presence.ts";
import type { AgentStatus } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
import { Schema } from "effect";

export const AGENT_STATES = ["preparing", "working", "waiting", "idle", "asleep", "stopped", "stranded", "retired"] as const;
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
	readonly stoppedAt: string | null;
	readonly subAgents: number;
	readonly toolCalls: number;
}

const STRANDED = "the runner lost it mid-turn — hail it to take the work back up";

const STOPPED = "a message from you resumes it";

const plainly = (state: AgentState): Situation => ({ detail: null, standing: state, state });

const waitingFor = (count: number, one: string, many: string): Situation => ({
	detail: null,
	standing: count === 1 ? `waiting for a ${one}` : `waiting for ${count} ${many}`,
	state: "waiting",
});

export const situation = (held: Standing): Situation => {
	if (held.status === "spawning") return { detail: held.birthDetail, standing: "preparing", state: "preparing" };
	if (held.status === "retired") return plainly("retired");
	if (held.stoppedAt !== null) return { detail: STOPPED, standing: "stopped by you", state: "stopped" };
	if (held.presence === "stranded") return { detail: STRANDED, standing: "stranded", state: "stranded" };
	if (held.status === "dormant" || held.presence === null || held.presence === "ended" || held.presence === "asleep") return plainly("asleep");
	if (held.subAgents > 0) return waitingFor(held.subAgents, "sub-agent", "sub-agents");
	if (held.toolCalls > 0) return waitingFor(held.toolCalls, "tool call", "tool calls");
	if (held.commands > 0) return waitingFor(held.commands, "command", "commands");
	return plainly(held.presence === "working" ? "working" : "idle");
};
