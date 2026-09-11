import { query } from "@antumbra/platform-feature/query.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Effect, Option, Schema } from "effect";
import { backendModelId } from "#ids.ts";
import { backendModel } from "#rows/backend-model.ts";

export const efforts = query("efforts", {
	input: { backend: AgentBackendTagSchema, model: Schema.String },
	output: Schema.Array(Schema.String),
	reads: [backendModel],
	scope: (input) => input.backend,
	run: Effect.fn("backends.efforts")(function* (input, rows) {
		const offered = yield* rows.backendModel.find(backendModelId(input.backend, input.model));
		return Option.isNone(offered) ? [] : offered.value.efforts;
	}),
});
