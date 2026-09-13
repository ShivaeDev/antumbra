import type { ModelInfo } from "@anthropic-ai/claude-agent-sdk";
import type { ModelChoice } from "@antumbra/runner-ports/backend.ts";

// Claude lists an alias row valued "default" beside the real models; its `resolvedModel` names the model Claude recommends today.
const ALIAS = "default";

export const modelChoices = (models: ReadonlyArray<ModelInfo>): ReadonlyArray<ModelChoice> => {
	const recommended = models.find((model) => model.value === ALIAS)?.resolvedModel;
	const listed: ModelChoice[] = [];
	let declared = false;
	for (const model of models) {
		if (model.value === ALIAS) continue;
		const isDefault = !declared && recommended !== undefined && model.resolvedModel === recommended;
		if (isDefault) declared = true;
		listed.push({
			defaultEffort: null,
			efforts: model.supportedEffortLevels ?? [],
			id: model.value,
			isDefault,
			name: model.displayName,
		});
	}
	return listed;
};
