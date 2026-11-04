import type { BackendsEvent } from "@antumbra/platform-vocabulary/backends-event.ts";
import { backendModelId } from "@antumbra/platform-vocabulary/backends-ids.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect, Option } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#postgres/backends/rows.ts";

export const apply = (handles: Effect.Success<typeof rows>) =>
	Effect.fn("BackendsHistory.apply")(function* ({ value }: Event<typeof BackendsEvent.Type>) {
		const held = yield* handles.backendCatalog.find(value.backend);
		if (value._tag === "CapabilityObserved") {
			if (Option.isSome(held)) yield* handles.backendCatalog.update(value.backend, { imageInput: value.imageInput });
			else yield* handles.backendCatalog.insert({ backend: value.backend, imageInput: value.imageInput, failure: null });
		} else {
			yield* projectModels(handles, value);
		}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra."backendModel"`;
	yield* sql`delete from antumbra."backendCatalog"`;
	yield* invalidateOnCommit(["backendModel", "backendCatalog"]);
});

const projectModels = Effect.fn("BackendsHistory.projectModels")(function* (
	handles: Effect.Success<typeof rows>,
	value: Extract<typeof BackendsEvent.Type, { readonly _tag: "ModelsListed" }>,
) {
	const held = yield* handles.backendCatalog.find(value.backend);
	const listed = new Set(value.models.map((model) => backendModelId(value.backend, model.model)));
	for (const model of value.models) {
		const id = backendModelId(value.backend, model.model);
		const row = { ...model, id, backend: value.backend };
		if (yield* handles.backendModel.exists(id)) yield* handles.backendModel.update(id, row);
		else yield* handles.backendModel.insert(row);
	}
	for (const gone of yield* handles.backendModel.where({ backend: value.backend }))
		if (!listed.has(gone.id)) yield* handles.backendModel.delete(gone.id);
	const row = { backend: value.backend, failure: value.failure, imageInput: Option.isSome(held) ? held.value.imageInput : null };
	if (Option.isSome(held)) yield* handles.backendCatalog.update(value.backend, row);
	else yield* handles.backendCatalog.insert(row);
});
