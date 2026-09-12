import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { admit } from "#commands/admit.ts";
import { cancel } from "#commands/cancel.ts";
import { hail } from "#commands/hail.ts";
import { request } from "#commands/request.ts";
import { retry } from "#commands/retry.ts";
import { startAdmitted } from "#facts/start-admitted.ts";
import { startCancelled } from "#facts/start-cancelled.ts";
import { startRequested } from "#facts/start-requested.ts";
import { startRetried } from "#facts/start-retried.ts";
import { startAdmittedMaterializer } from "#materializers/start-admitted.ts";
import { startCancelledMaterializer } from "#materializers/start-cancelled.ts";
import { startRequestedMaterializer } from "#materializers/start-requested.ts";
import { startRetriedMaterializer } from "#materializers/start-retried.ts";
import { admitted } from "#queries/admitted.ts";
import { all } from "#queries/all.ts";
import { pending } from "#queries/pending.ts";
import { start } from "#rows/start.ts";
export const starts = feature("starts", {
	rows: [start, agent, pieceAgent, voyageAgent, piece, voyage, session, sessionOperation, count, flag, capacity],
	facts: [startRequested, startAdmitted, startCancelled, startRetried],
	commands: [request, hail, admit, cancel, retry],
	materializers: [startRequestedMaterializer, startAdmittedMaterializer, startCancelledMaterializer, startRetriedMaterializer],
	queries: [all, pending, admitted],
});
