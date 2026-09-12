import * as Id from "@antumbra/platform-vocabulary/id.ts";
import type { ToolContext } from "#context.ts";

export const requestId = (context: ToolContext, step = ""): Id.Request => Id.Request.make(JSON.stringify([context.sessionId, context.callId, step]));
