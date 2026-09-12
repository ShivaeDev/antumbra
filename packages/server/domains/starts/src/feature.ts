import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceAssignmentWork } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { sessionStartResult } from "@antumbra/domain-sessions/rows/session-start-result.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { admit } from "#commands/admit.ts";
import { cancel } from "#commands/cancel.ts";
import { hail } from "#commands/hail.ts";
import { hold } from "#commands/hold.ts";
import { request } from "#commands/request.ts";
import { retry } from "#commands/retry.ts";
import { startAdmitted } from "#facts/start-admitted.ts";
import { startCancelled } from "#facts/start-cancelled.ts";
import { startHeld } from "#facts/start-held.ts";
import { startRequested } from "#facts/start-requested.ts";
import { startRetried } from "#facts/start-retried.ts";
import { startAdmittedMaterializer } from "#materializers/start-admitted.ts";
import { startCancelledMaterializer } from "#materializers/start-cancelled.ts";
import { startHeldMaterializer } from "#materializers/start-held.ts";
import { startRequestedMaterializer } from "#materializers/start-requested.ts";
import { startRetriedMaterializer } from "#materializers/start-retried.ts";
import { admitted } from "#queries/admitted.ts";
import { all } from "#queries/all.ts";
import { bySession } from "#queries/by-session.ts";
import { pending } from "#queries/pending.ts";
import { start } from "#rows/start.ts";
export const starts = feature("starts", {
	rows: [
		pieceAssignmentWork,
		pieceProgress,
		sessionStartResult,
		start,
		agent,
		pieceAgent,
		voyageAgent,
		piece,
		voyage,
		session,
		sessionOperation,
		count,
		flag,
		capacity,
	],
	facts: [startHeld, startRequested, startAdmitted, startCancelled, startRetried],
	commands: [hold, request, hail, admit, cancel, retry],
	materializers: [startHeldMaterializer, startRequestedMaterializer, startAdmittedMaterializer, startCancelledMaterializer, startRetriedMaterializer],
	queries: [all, pending, admitted, bySession],
});
