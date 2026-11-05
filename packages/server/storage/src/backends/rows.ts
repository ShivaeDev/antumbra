import { row } from "@antumbra/platform-feature/row.ts";
import { BackendCatalog, BackendModel } from "@antumbra/platform-vocabulary/backends.ts";
import { Records } from "#records.ts";
export const rows = Records;

export const backendModel = row("backendModel", BackendModel.fields, { key: "id", scope: "backend" });

export const backendCatalog = row("backendCatalog", BackendCatalog.fields, { key: "backend", scope: "backend" });
