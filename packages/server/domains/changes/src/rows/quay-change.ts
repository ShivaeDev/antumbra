import { row } from "@antumbra/platform-feature/row.ts";
import { QuayChange } from "@antumbra/platform-vocabulary/changes.ts";
export const quayChange = row("quayChange", QuayChange.fields, { key: "id" });
