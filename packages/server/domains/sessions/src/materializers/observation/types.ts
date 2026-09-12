import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { WriteHandles } from "@antumbra/platform-feature/handles.ts";
import type { observed } from "#facts/observed.ts";
import { session } from "#rows/session.ts";
import { sessionGap } from "#rows/session-gap.ts";
import { sessionNode } from "#rows/session-node.ts";
import { sessionOperation } from "#rows/session-operation.ts";
import { sessionStartResult } from "#rows/session-start-result.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";

export const writes = [session, sessionOperation, sessionToolCall, sessionStartResult, sessionNode, sessionGap] as const;
export type Rows = WriteHandles<typeof writes>;
export type Observation = FactPayload<typeof observed> & { at: number; requestId: string; seq: number };
export type Session = typeof session.Row.Type;
