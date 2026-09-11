import { query } from "@antumbra/platform-feature/query.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Effect, Schema } from "effect";
import { backendModel } from "#rows/backend-model.ts";

export const models = query("models", {
	input: { backend: AgentBackendTagSchema },
	output: Schema.Array(backendModel.Row),
	reads: [backendModel],
	scope: (input) => input.backend,
	run: Effect.fn("backends.models")(function* (input, rows) {
		return yield* rows.backendModel.where({ backend: input.backend });
	}),
});
