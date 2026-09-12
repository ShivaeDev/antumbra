import { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceAssignmentWork } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { resourceOwner } from "@antumbra/domain-reclamation/rows/resource-owner.ts";
import { roleSetting } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { sessionStartResult } from "@antumbra/domain-sessions/rows/session-start-result.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { voyageActivity } from "@antumbra/domain-voyages/rows/voyage-activity.ts";
import { voyageCaptainWork } from "@antumbra/domain-voyages/rows/voyage-captain-work.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { admit } from "#commands/admit.ts";
import { cancel } from "#commands/cancel.ts";
import { hail } from "#commands/hail.ts";
import { hold } from "#commands/hold.ts";
import { request } from "#commands/request.ts";
import { retire } from "#commands/retire.ts";
import { retireCrew } from "#commands/retire-crew.ts";
import { retry } from "#commands/retry.ts";
import { smooth } from "#commands/smooth.ts";
import { spawn } from "#commands/spawn.ts";
import { workNow } from "#commands/work-now.ts";
import { agentRetired } from "#facts/agent-retired.ts";
import { birthAdmitted } from "#facts/birth-admitted.ts";
import { birthCancelled } from "#facts/birth-cancelled.ts";
import { birthHeld } from "#facts/birth-held.ts";
import { birthRequested } from "#facts/birth-requested.ts";
import { birthRetried } from "#facts/birth-retried.ts";
import { crewRetired } from "#facts/crew-retired.ts";
import { smoothingRequested } from "#facts/smoothing-requested.ts";
import { agentRetiredMaterializer } from "#materializers/agent-retired.ts";
import { birthAdmittedMaterializer } from "#materializers/birth-admitted.ts";
import { birthCancelledMaterializer } from "#materializers/birth-cancelled.ts";
import { birthHeldMaterializer } from "#materializers/birth-held.ts";
import { birthRequestedMaterializer } from "#materializers/birth-requested.ts";
import { birthRetriedMaterializer } from "#materializers/birth-retried.ts";
import { crewRetiredMaterializer } from "#materializers/crew-retired.ts";
import { smoothingRequestedMaterializer } from "#materializers/smoothing-requested.ts";
import { Charter } from "#ports/charter.ts";
import { Provisioning } from "#ports/provisioning.ts";
import { RunnerOperations } from "#ports/runner-operations.ts";
import { ToolCatalog } from "#ports/tool-catalog.ts";
import { admitted } from "#queries/admitted.ts";
import { all } from "#queries/all.ts";
import { authority } from "#queries/authority.ts";
import { birthBySession } from "#queries/birth-by-session.ts";
import { births } from "#queries/births.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
import { bySession } from "#queries/by-session.ts";
import { byVoyage } from "#queries/by-voyage.ts";
import { canRetireCrew } from "#queries/can-retire-crew.ts";
import { captain } from "#queries/captain.ts";
import { captain as captainView } from "#queries/captain-reading.ts";
import { dispatch } from "#queries/dispatch.ts";
import { dueRetirements } from "#queries/due-retirements.ts";
import { dueSiestas } from "#queries/due-siestas.ts";
import { pending } from "#queries/pending.ts";
import { reading } from "#queries/reading.ts";
import { roster } from "#queries/roster.ts";
import { smoother } from "#queries/smoother.ts";
import { workingCount } from "#queries/working-count.ts";
import { admitting } from "#reconcilers/admitting.ts";
import { dispatching } from "#reconcilers/dispatching.ts";
import { executing } from "#reconcilers/executing.ts";
import { resting } from "#reconcilers/resting.ts";
import { agent } from "#rows/agent.ts";
import { agentReading } from "#rows/agent-reading.ts";
import { birth } from "#rows/birth.ts";
import { captainReading } from "#rows/captain-reading.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const agents = feature("agents", {
	rows: [
		piece,
		voyageActivity,
		count,
		flag,
		pieceProgress,
		captainReading,
		agentReading,
		resourceOwner,
		pieceAssignmentWork,
		voyageCaptainWork,
		agent,
		birth,
		pieceAgent,
		voyageAgent,
		session,
		sessionOperation,
		sessionStartResult,
		capacity,
		voyage,
		roleSetting,
		backendModel,
	],
	facts: [crewRetired, agentRetired, smoothingRequested, birthRequested, birthAdmitted, birthHeld, birthCancelled, birthRetried],
	commands: [retireCrew, retire, spawn, hail, workNow, request, admit, hold, cancel, retry, smooth],
	materializers: [
		crewRetiredMaterializer,
		agentRetiredMaterializer,
		smoothingRequestedMaterializer,
		birthRequestedMaterializer,
		birthAdmittedMaterializer,
		birthHeldMaterializer,
		birthCancelledMaterializer,
		birthRetriedMaterializer,
	],
	queries: [
		canRetireCrew,
		smoother,
		captainView,
		byVoyage,
		byPiece,
		dueSiestas,
		dueRetirements,
		roster,
		reading,
		bySession,
		workingCount,
		all,
		byId,
		captain,
		authority,
		births,
		birthBySession,
		dispatch,
		pending,
		admitted,
	],
	ports: [Charter, Provisioning, RunnerOperations, ToolCatalog],
	reconcilers: [dispatching, admitting, executing, resting],
});
