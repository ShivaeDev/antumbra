import type { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionGap } from "@antumbra/domain-sessions/rows/session-gap.ts";
import { sessionNode } from "@antumbra/domain-sessions/rows/session-node.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { sessionStartResult } from "@antumbra/domain-sessions/rows/session-start-result.ts";
import { sessionToolCall } from "@antumbra/domain-sessions/rows/session-tool-call.ts";
import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { Records } from "#records.ts";

export const writes = [session, sessionOperation, sessionToolCall, sessionStartResult, sessionNode, sessionGap] as const;
export type Rows = Records["Service"];
export type Observation = FactPayload<typeof observed> & { at: number; requestId: string; seq: number };
export type Session = typeof session.Row.Type;
