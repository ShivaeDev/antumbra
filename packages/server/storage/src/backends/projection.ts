import type { BackendsEvent } from "@antumbra/platform-vocabulary/backends-event.ts";
import { backendModelId } from "@antumbra/platform-vocabulary/backends-ids.ts";
import { selection as backendCatalogSelection } from "@antumbra/server-storage/records/backend-catalog.ts";
import { selection as backendModelSelection } from "@antumbra/server-storage/records/backend-model.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect, Option } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#backends/rows.ts";

export const apply = (handles: Effect.Success<typeof rows>) =>
	Effect.fn("BackendsHistory.apply")(function* ({ value }: Event<typeof BackendsEvent.Type>) {
		const held = yield* handles.backendCatalog
			.findOne({ where: { backend: value.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendCatalogSelection })
			.pipe(Effect.orDie);
		if (value._tag === "CapabilityObserved") {
			if (Option.isSome(held))
				yield* handles.backendCatalog.updateVoid({ ...{ imageInput: value.imageInput }, backend: value.backend }).pipe(Effect.orDie);
			else yield* handles.backendCatalog.insertVoid({ backend: value.backend, imageInput: value.imageInput, failure: null }).pipe(Effect.orDie);
		} else {
			yield* projectModels(handles, value);
		}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from "backendModel"`;
	yield* sql`delete from "backendCatalog"`;
	yield* invalidateOnCommit(["backendModel", "backendCatalog"]);
});

const projectModels = Effect.fn("BackendsHistory.projectModels")(function* (
	handles: Effect.Success<typeof rows>,
	value: Extract<typeof BackendsEvent.Type, { readonly _tag: "ModelsListed" }>,
) {
	const held = yield* handles.backendCatalog
		.findOne({ where: { backend: value.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendCatalogSelection })
		.pipe(Effect.orDie);
	const listed = new Set(value.models.map((model) => backendModelId(value.backend, model.model)));
	for (const model of value.models) {
		const id = backendModelId(value.backend, model.model);
		const row = { ...model, id, backend: value.backend };
		if (
			yield* handles.backendModel.count({ where: { id: id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* handles.backendModel.updateVoid({ ...row, id: id }).pipe(Effect.orDie);
		else yield* handles.backendModel.insertVoid(row).pipe(Effect.orDie);
	}
	for (const gone of yield* handles.backendModel
		.findMany({ where: { backend: value.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendModelSelection })
		.pipe(Effect.orDie))
		if (!listed.has(gone.id)) yield* handles.backendModel.delete(gone.id).pipe(Effect.orDie);
	const row = { backend: value.backend, failure: value.failure, imageInput: Option.isSome(held) ? held.value.imageInput : null };
	if (Option.isSome(held)) yield* handles.backendCatalog.updateVoid({ ...row, backend: value.backend }).pipe(Effect.orDie);
	else yield* handles.backendCatalog.insertVoid(row).pipe(Effect.orDie);
});
