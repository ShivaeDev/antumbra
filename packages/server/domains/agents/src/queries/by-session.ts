import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const bySession = query("bySession", {
	input: { sessionId: SessionId },
	output: Schema.NullOr(agentReading.Row),
	reads: [agentReading],
});
