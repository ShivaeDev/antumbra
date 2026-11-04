import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeFeedback } from "@antumbra/platform-vocabulary/changes.ts";
export const changeFeedback = row("changeFeedback", ChangeFeedback.fields, { key: "id", scope: "changeId" });
export type ChangeFeedbackRow = typeof changeFeedback.Row.Type;
