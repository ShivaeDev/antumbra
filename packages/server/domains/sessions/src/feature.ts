import { feature } from "@antumbra/platform-feature/feature.ts";
import { operationHeld, operationHeldMaterializer } from "#commands/hold.ts";
import { request } from "#commands/request.ts";
import { observed } from "#facts/observed.ts";
import { operationRequested } from "#facts/operation-requested.ts";
import { observedMaterializer } from "#materializers/observed.ts";
import { operationRequestedMaterializer } from "#materializers/operation-requested.ts";
import { pending } from "#queries/pending.ts";
import { forAgent, reading, tree } from "#queries/reading.ts";
import { session } from "#rows/session.ts";
import { sessionOperation } from "#rows/session-operation.ts";
import { sessionStartResult } from "#rows/session-start-result.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";
export const sessions = feature("sessions", {
	rows: [session, sessionOperation, sessionToolCall, sessionStartResult],
	facts: [observed, operationRequested, operationHeld],
	commands: [request],
	materializers: [observedMaterializer, operationRequestedMaterializer, operationHeldMaterializer],
	queries: [reading, tree, forAgent, pending],
});
