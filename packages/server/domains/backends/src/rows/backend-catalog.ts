import { row } from "@antumbra/platform-feature/row.ts";
import { BackendCatalog } from "@antumbra/platform-vocabulary/backends.ts";
export const backendCatalog = row("backendCatalog", BackendCatalog.fields, { key: "backend", scope: "backend" });
