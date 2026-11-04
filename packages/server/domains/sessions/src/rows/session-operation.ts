import { row } from "@antumbra/platform-feature/row.ts";
import { SessionOperation, SessionOperationFields } from "@antumbra/platform-vocabulary/session-operation.ts";
export const operationFields = SessionOperationFields.fields;
export const sessionOperation = row("sessionOperation", SessionOperation.fields, { key: "id", scope: "sessionId" });
