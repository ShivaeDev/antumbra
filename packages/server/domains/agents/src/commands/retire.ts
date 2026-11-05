import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { agentRetired } from "#facts/agent-retired.ts";
import { agent } from "#rows/agent.ts";
export const retire = command("retire", {
	input: { id: AgentId },
	reads: [agent, session],
	emits: agentRetired,
	rejections: { Unknown: { id: Schema.String }, Working: { agentId: Schema.String, sessionId: Schema.String } },
});
