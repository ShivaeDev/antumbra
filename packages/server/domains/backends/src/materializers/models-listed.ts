import { materializer } from "@antumbra/feature/materializer.ts";
import { Effect, Option } from "effect";
import { modelsListed } from "#facts/models-listed.ts";
import { type BackendModelId, backendModelId } from "#ids.ts";
import { backendCatalog } from "#rows/backend-catalog.ts";
import { backendModel } from "#rows/backend-model.ts";

export const modelsListedMaterializer = materializer(modelsListed, {
	writes: [backendModel, backendCatalog],
	run: Effect.fn("backends.ModelsListed")(function* (fact, rows) {
		const listed = new Set<BackendModelId>();
		for (const model of fact.models) {
			const id = backendModelId(fact.backend, model.model);
			const offered = { backend: fact.backend, efforts: model.efforts, id, isDefault: model.isDefault, model: model.model, name: model.name };
			const known = yield* rows.backendModel.find(id);
			listed.add(id);
			yield* Option.isNone(known) ? rows.backendModel.insert(offered) : rows.backendModel.update(id, offered);
		}
		const stored = yield* rows.backendModel.where({ backend: fact.backend });
		for (const gone of stored.filter((candidate) => !listed.has(candidate.id))) {
			yield* rows.backendModel.delete(gone.id);
		}
		const catalogued = { backend: fact.backend, failure: fact.failure };
		const catalog = yield* rows.backendCatalog.find(fact.backend);
		yield* Option.isNone(catalog) ? rows.backendCatalog.insert(catalogued) : rows.backendCatalog.update(fact.backend, catalogued);
	}),
});
