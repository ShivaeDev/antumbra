import { command } from "@antumbra/platform-feature/command.ts";
import { optional, titled } from "@antumbra/platform-feature/edit.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Schema } from "effect";
import { birthRequested } from "#facts/birth-requested.ts";
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
});
