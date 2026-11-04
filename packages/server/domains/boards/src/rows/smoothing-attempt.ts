import { row } from "@antumbra/platform-feature/row.ts";
import { SmoothingAttempt } from "@antumbra/platform-vocabulary/boards.ts";
export const smoothingAttempt = row("smoothingAttempt", SmoothingAttempt.fields, { key: "id", scope: "voyageId" });
