import { row } from "@antumbra/platform-feature/row.ts";
import { SessionSituation } from "@antumbra/platform-vocabulary/changes.ts";

export const sessionSituation = row("sessionSituation", SessionSituation.fields, { key: "id", scope: "sessionId" });
