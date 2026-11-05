import { command } from "@antumbra/platform-feature/command.ts";
import { modelsListed } from "#facts/models-listed.ts";

export const listModels = command("listModels", {
	input: modelsListed.payload,
	reads: [],
	emits: modelsListed,
	rejections: {},
});
