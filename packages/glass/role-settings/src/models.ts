import type { BackendModels } from "#shape.ts";

export const NO_MODELS: BackendModels = { failure: null, models: [], tag: "" };

export const modelsFor = (backends: readonly BackendModels[], tag: string): BackendModels => {
	for (const backend of backends) {
		if (backend.tag === tag) {
			return backend;
		}
	}
	return NO_MODELS;
};

export const defaultModelId = (catalog: BackendModels): string => {
	for (const choice of catalog.models) {
		if (choice.isDefault) {
			return choice.id;
		}
	}
	return "";
};

export const effortsFor = (catalog: BackendModels, model: string): readonly string[] => {
	for (const choice of catalog.models) {
		if (choice.id === model) {
			return choice.efforts;
		}
	}
	return [];
};
