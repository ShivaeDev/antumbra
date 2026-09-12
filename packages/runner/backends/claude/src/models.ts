import type { ModelInfo } from "@anthropic-ai/claude-agent-sdk";
import type { ModelChoice } from "@antumbra/runner-ports/backend.ts";

// Claude lists an alias row valued "default" beside the real models; its `resolvedModel` names the model Claude recommends today.
const ALIAS = "default";

export const modelChoices = (models: ReadonlyArray<ModelInfo>): ReadonlyArray<ModelChoice> => {
	const recommended = models.find((model) => model.value === ALIAS)?.resolvedModel;
	const listed: ModelChoice[] = [];
	let declared: string | undefined;
	for (const model of models) {
		if (model.value === ALIAS) continue;
		if (declared === undefined && recommended !== undefined && model.resolvedModel === recommended) declared = model.value;
		listed.push({
			defaultEffort: null,
			efforts: model.supportedEffortLevels ?? [],
			id: model.value,
			isDefault: false,
			name: model.displayName,
		});
	}
	return listed.map((model) => (model.id === declared ? { ...model, isDefault: true } : model));
};
