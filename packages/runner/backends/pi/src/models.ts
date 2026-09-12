import type { ModelChoice } from "@antumbra/runner-ports/backend.ts";
import { piEfforts } from "#effort.ts";
import type { PiModel } from "#runtime.ts";

export const modelChoices = (models: ReadonlyArray<PiModel>): ReadonlyArray<ModelChoice> =>
	models.map((model) => ({ efforts: piEfforts, id: model.id, isDefault: false, name: model.name }));
