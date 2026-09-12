import { fact } from "@antumbra/platform-feature/fact.ts";
import { sessionOperation } from "#rows/session-operation.ts";
export const operationRequested = fact("SessionOperationRequested", sessionOperation.fields);
