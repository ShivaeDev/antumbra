import { row } from "@antumbra/platform-feature/row.ts";
import { Session } from "@antumbra/platform-vocabulary/session.ts";
export const session = row("session", Session.fields, { key: "id", scope: "agentId" });
