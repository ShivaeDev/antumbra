import { row } from "@antumbra/platform-feature/row.ts";
import { BackendModel } from "@antumbra/platform-vocabulary/backends.ts";
export const backendModel = row("backendModel", BackendModel.fields, { key: "id", scope: "backend" });
