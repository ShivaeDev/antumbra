import type { modelsListed } from "@antumbra/domain-backends/facts/models-listed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { type BackendModelId, backendModelId } from "@antumbra/platform-vocabulary/backends-ids.ts";
import { selection as backendCatalogSelection } from "@antumbra/server-storage/records/backend-catalog.ts";
import { selection as backendModelSelection } from "@antumbra/server-storage/records/backend-model.ts";
import { Effect, Option } from "effect";
import { Records } from "#records.ts";

export const modelsListedMaterializer = Effect.fn("backends.ModelsListed")(function* (
	fact: FactValue<typeof modelsListed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const listed = new Set<BackendModelId>();
	for (const model of fact.models) {
		const id = backendModelId(fact.backend, model.model);
		const offered = {
			backend: fact.backend,
			defaultEffort: model.defaultEffort,
			efforts: model.efforts,
			id,
			isDefault: model.isDefault,
			model: model.model,
			name: model.name,
		};
		const known = yield* rows.backendModel
			.findOne({ where: { id: id }, orderBy: { field: "storage_order", direction: "asc" }, select: backendModelSelection })
			.pipe(Effect.orDie);
		listed.add(id);
		yield* Option.isNone(known)
			? rows.backendModel.insertVoid(offered).pipe(Effect.orDie)
			: rows.backendModel.updateVoid({ ...offered, id: id }).pipe(Effect.orDie);
	}
	const stored = yield* rows.backendModel
		.findMany({ where: { backend: fact.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendModelSelection })
		.pipe(Effect.orDie);
	for (const gone of stored.filter((candidate) => !listed.has(candidate.id))) {
		yield* rows.backendModel.delete(gone.id).pipe(Effect.orDie);
	}
	const catalog = yield* rows.backendCatalog
		.findOne({ where: { backend: fact.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendCatalogSelection })
		.pipe(Effect.orDie);
	const catalogued = { backend: fact.backend, failure: fact.failure, imageInput: Option.isSome(catalog) ? catalog.value.imageInput : null };
	yield* Option.isNone(catalog)
		? rows.backendCatalog.insertVoid(catalogued).pipe(Effect.orDie)
		: rows.backendCatalog.updateVoid({ ...catalogued, backend: fact.backend }).pipe(Effect.orDie);
});
