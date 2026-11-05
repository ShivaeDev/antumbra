import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { toolAnswered } from "#commands/answer-tool.ts";
import { toolCalled } from "#commands/call-tool.ts";
import { charter, sessionChartered } from "#commands/charter.ts";
import { operationHeld } from "#commands/hold.ts";
import { request } from "#commands/request.ts";
import { operationRetried, retry } from "#commands/retry.ts";
import { sessionStopped, stop } from "#commands/stop.ts";
import { observed } from "#facts/observed.ts";
import { operationRequested } from "#facts/operation-requested.ts";
import { providerEvent } from "#facts/provider-event.ts";
import { opening } from "#queries/opening.ts";
import { operations } from "#queries/operations.ts";
import { pending } from "#queries/pending.ts";
import { forAgent, reading } from "#queries/reading.ts";
import { toolCall } from "#queries/tool-call.ts";
import { transcriptSources } from "#queries/transcript.ts";
import { tree } from "#queries/tree.ts";
import { session } from "#rows/session.ts";
import { sessionCapacityWait } from "#rows/session-capacity-wait.ts";
import { sessionEvent } from "#rows/session-event.ts";
import { sessionGap } from "#rows/session-gap.ts";
import { sessionNode } from "#rows/session-node.ts";
import { sessionOpening } from "#rows/session-opening.ts";
import { sessionOperation } from "#rows/session-operation.ts";
import { sessionStartResult } from "#rows/session-start-result.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";
import { sessionUsage } from "#rows/session-usage.ts";
export const sessions = feature("sessions", {
	rows: [
		flag,
		sessionCapacityWait,
		sessionEvent,
		sessionUsage,
		session,
		sessionOpening,
		sessionOperation,
		sessionToolCall,
		sessionStartResult,
		sessionNode,
		sessionGap,
	],
	facts: [providerEvent, toolCalled, operationRetried, toolAnswered, observed, operationRequested, operationHeld, sessionChartered, sessionStopped],
	commands: [request, retry, charter, stop],
	queries: [operations, opening, transcriptSources, toolCall, reading, tree, forAgent, pending],
});
