import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeTransition } from "@antumbra/platform-vocabulary/changes.ts";
export const changeTransition = row("changeTransition", ChangeTransition.fields, { key: "id", scope: "changeId" });
