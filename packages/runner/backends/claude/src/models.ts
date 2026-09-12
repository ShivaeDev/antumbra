import type { ModelInfo } from "@anthropic-ai/claude-agent-sdk";
import type { ModelChoice } from "@antumbra/runner-ports/backend.ts";

// Claude lists an alias row valued "default" beside the real models; its `resolvedModel` names the model Claude recommends today.
const ALIAS = "default";

export const modelChoices = (models: ReadonlyArray<ModelInfo>): ReadonlyArray<ModelChoice> => {
	const alias = models.find((model) => model.value === ALIAS);
	const recommended = alias?.resolvedModel;
	const choices: ModelChoice[] = [];
	for (const model of models) {
		if (model.value === ALIAS) continue;
		choices.push({
			defaultEffort: null,
			efforts: model.supportedEffortLevels ?? [],
			id: model.value,
			isDefault: recommended !== undefined && model.resolvedModel === recommended,
			name: model.displayName,
		});
	}
	return choices;
};
