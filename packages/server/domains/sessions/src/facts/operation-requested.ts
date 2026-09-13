import { fact } from "@antumbra/platform-feature/fact.ts";
import { operationFields } from "#rows/session-operation.ts";
export const operationRequested = fact("SessionOperationRequested", operationFields);
