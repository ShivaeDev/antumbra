import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { agentRetired } from "#facts/agent-retired.ts";
import { AgentId } from "#ids.ts";
import { agent } from "#rows/agent.ts";
export const retire = command("retire", {
	input: { id: AgentId },
	reads: [agent, session],
	emits: agentRetired,
	rejections: { Unknown: { id: Schema.String }, Working: { agentId: Schema.String, sessionId: Schema.String } },
	run: Effect.fn("Agents.retire")(function* (input, rows, reject) {
		if (Option.isNone(yield* rows.agent.find(input.id))) return yield* reject.Unknown({ id: input.id });
		const roots = yield* rows.session.where({ agentId: input.id, parentSessionId: null, status: "open" });
		const working = roots.find((root) => root.attached && root.executionStatus === "active");
		if (working !== undefined) return yield* reject.Working({ agentId: input.id, sessionId: working.id });
		return { id: input.id };
	}),
});
