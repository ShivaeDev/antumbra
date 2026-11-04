import { row } from "@antumbra/platform-feature/row.ts";
import { SessionInput } from "@antumbra/platform-vocabulary/inputs.ts";
import { Capacity } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { Session } from "@antumbra/platform-vocabulary/session.ts";
import { SessionOperation } from "@antumbra/platform-vocabulary/session-operation.ts";

export const sessionInput = row("sessionInput", SessionInput.fields, { key: "id", scope: "sessionId" });
export const session = row("session", Session.fields, { key: "id", scope: "agentId" });
export const sessionOperation = row("sessionOperation", SessionOperation.fields, { key: "id", scope: "sessionId" });
export const capacity = row("capacity", Capacity.fields, { key: "backend" });
