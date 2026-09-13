import type { AgentBackendTag } from "@antumbra/platform-vocabulary/agent-backend.ts";
import type { App } from "#entry.ts";

export const knownModels = (api: App["api"], backend: AgentBackendTag, model: string, defaultEffort: string | null = null) =>
	api.backends.listModels({
		backend,
		failure: null,
		models: [{ defaultEffort, efforts: defaultEffort === null ? [] : [defaultEffort], isDefault: true, model, name: model }],
	});
