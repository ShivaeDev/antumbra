import type { ModelChoice } from "@antumbra/runner-ports/backend.ts";
import { piEfforts } from "#effort.ts";
import type { PiModel } from "#runtime.ts";

// Pi names no default, so the model it lists first stands for it.
export const modelChoices = (models: ReadonlyArray<PiModel>): ReadonlyArray<ModelChoice> =>
	models.map((model, place) => ({ defaultEffort: null, efforts: piEfforts, id: model.id, isDefault: place === 0, name: model.name }));
