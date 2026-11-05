import { query } from "@antumbra/platform-feature/query.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
export const byId = query("byId", {
	input: { id: AgentId },
	output: Schema.NullOr(agent.Row),
	reads: [agent],
});
