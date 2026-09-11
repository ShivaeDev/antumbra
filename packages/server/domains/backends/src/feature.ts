import { feature } from "@antumbra/platform-feature/feature.ts";
import { listModels } from "#commands/list-models.ts";
import { modelsListed } from "#facts/models-listed.ts";
import { modelsListedMaterializer } from "#materializers/models-listed.ts";
import { catalog } from "#queries/catalog.ts";
import { efforts } from "#queries/efforts.ts";
import { models } from "#queries/models.ts";
import { backendCatalog } from "#rows/backend-catalog.ts";
import { backendModel } from "#rows/backend-model.ts";

export const backends = feature("backends", {
	rows: [backendModel, backendCatalog],
	facts: [modelsListed],
	commands: [listModels],
	materializers: [modelsListedMaterializer],
	queries: [models, efforts, catalog],
});
