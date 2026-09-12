import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { freeze } from "#tools/freeze.ts";

export const identity = (requestId: Request) => ({
	agentId: AgentId.make(requestId),
	sessionId: SessionId.make(`${requestId}:session`),
});

export const binding = Effect.fn("Starts.binding")(function* (context: Parameters<typeof freeze>[0]) {
	const frozen = yield* freeze(context);
	return { toolSetVersion: frozen.version, tools: frozen.tools };
});
