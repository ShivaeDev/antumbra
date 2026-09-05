import type { ModelChoice } from "@antumbra/plugin-api";
import { piEfforts } from "#effort.ts";
import type { PiModel } from "#runtime.ts";

// pi picks its own model from its settings when a voyage names none, so no choice here is the default.
export const modelChoices = (models: ReadonlyArray<PiModel>): ReadonlyArray<ModelChoice> =>
	models.map((model) => ({ efforts: piEfforts, id: model.id, isDefault: false, name: model.name }));
