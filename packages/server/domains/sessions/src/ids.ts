import { SessionId as Identity, SessionOperationId as OperationIdentity } from "@antumbra/platform-vocabulary/session-ids.ts";
export const SessionId = Identity;
export type SessionId = typeof SessionId.Type;
export const SessionOperationId = OperationIdentity;
export type SessionOperationId = typeof SessionOperationId.Type;
