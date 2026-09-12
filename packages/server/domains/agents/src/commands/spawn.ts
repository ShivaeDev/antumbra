import { command } from "@antumbra/platform-feature/command.ts";
import { optional, titled } from "@antumbra/platform-feature/edit.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Effect, Schema } from "effect";
import { birthRequested } from "#facts/birth-requested.ts";
import { identity } from "#ids.ts";
import { agent } from "#rows/agent.ts";

export const spawn = command("spawn", {
	input: {
		role: titled(Schema.NonEmptyString, { title: "Role" }),
		backend: optional(AgentBackendTagSchema, { title: "Backend" }),
		model: optional(Schema.String, { title: "Model" }),
		effort: optional(Schema.String, { title: "Effort" }),
	},
	reads: [agent],
	emits: birthRequested,
	rejections: { AgentExists: { id: Schema.String } },
	run: Effect.fn("Agents.spawn")(function* (input, rows, reject) {
		const ids = identity(input.requestId);
		if (yield* rows.agent.exists(ids.agentId)) return yield* reject.AgentExists({ id: ids.agentId });
		return {
			wakeSessionId: null,
			id: ids.birthId,
			source: "direct" as const,
			agentId: ids.agentId,
			sessionId: ids.sessionId,
			voyageId: null,
			pieceId: null,
			backend: input.backend,
			model: input.model,
			effort: input.effort,
			role: input.role,
		};
	}),
});
