import { command } from "@antumbra/feature/command.ts";
import { Effect } from "effect";
import { modelsListed } from "#facts/models-listed.ts";

export const listModels = command("listModels", {
	input: modelsListed.payload,
	reads: [],
	emits: modelsListed,
	rejections: {},
	run: (input) => Effect.succeed({ backend: input.backend, failure: input.failure, models: input.models }),
});
