import { row } from "@antumbra/platform-feature/row.ts";
import { Change } from "@antumbra/platform-vocabulary/changes.ts";
export const change = row("change", Change.fields, { key: "id", scope: "repoId" });
export type ChangeRow = typeof change.Row.Type;
