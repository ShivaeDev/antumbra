import { sessionUsage } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";

export const forAgent = query("forAgent", {
	input: { agentId: Schema.String },
	output: UsageTotal,
	reads: [sessionUsage],
	scope: (input) => input.agentId,
});
