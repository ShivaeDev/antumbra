import { feature } from "@antumbra/platform-feature/feature.ts";
import { toolAnswered, toolAnsweredMaterializer } from "#commands/answer-tool.ts";
import { toolCalled, toolCalledMaterializer } from "#commands/call-tool.ts";
import { operationHeld, operationHeldMaterializer } from "#commands/hold.ts";
import { request } from "#commands/request.ts";
import { operationRetried, operationRetriedMaterializer, retry } from "#commands/retry.ts";
import { observed } from "#facts/observed.ts";
import { operationRequested } from "#facts/operation-requested.ts";
import { providerEvent } from "#facts/provider-event.ts";
import { observedMaterializer } from "#materializers/observed.ts";
import { operationRequestedMaterializer } from "#materializers/operation-requested.ts";
import { providerEventMaterializer } from "#materializers/provider-event.ts";
import { pending } from "#queries/pending.ts";
import { forAgent, reading, tree } from "#queries/reading.ts";
import { toolCall } from "#queries/tool-call.ts";
import { transcriptSources } from "#queries/transcript.ts";
import { usageAgent } from "#queries/usage.ts";
import { session } from "#rows/session.ts";
import { sessionEvent } from "#rows/session-event.ts";
import { sessionGap } from "#rows/session-gap.ts";
import { sessionNode } from "#rows/session-node.ts";
import { sessionOperation } from "#rows/session-operation.ts";
import { sessionStartResult } from "#rows/session-start-result.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";
import { sessionUsage } from "#rows/session-usage.ts";
export const sessions = feature("sessions", {
	rows: [sessionEvent, sessionUsage, session, sessionOperation, sessionToolCall, sessionStartResult, sessionNode, sessionGap],
	facts: [providerEvent, toolCalled, operationRetried, toolAnswered, observed, operationRequested, operationHeld],
	commands: [request, retry],
	materializers: [
		providerEventMaterializer,
		toolCalledMaterializer,
		operationRetriedMaterializer,
		toolAnsweredMaterializer,
		observedMaterializer,
		operationRequestedMaterializer,
		operationHeldMaterializer,
	],
	queries: [transcriptSources, usageAgent, toolCall, reading, tree, forAgent, pending],
});
