import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeVerdict } from "@antumbra/platform-vocabulary/changes.ts";
export const changeVerdict = row("changeVerdict", ChangeVerdict.fields, { key: "changeId" });
