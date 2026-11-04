import { row } from "@antumbra/platform-feature/row.ts";
import { BackendCatalog, BackendModel } from "@antumbra/platform-vocabulary/backends.ts";
import { Effect } from "effect";
import { rowsOf } from "#postgres/rows.ts";
export const rows = Effect.gen(function* () {
	return { backendModel: yield* rowsOf(backendModel, "backendModel"), backendCatalog: yield* rowsOf(backendCatalog, "backendCatalog") };
});

export const backendModel = row("backendModel", BackendModel.fields, { key: "id", scope: "backend" });

export const backendCatalog = row("backendCatalog", BackendCatalog.fields, { key: "backend", scope: "backend" });
