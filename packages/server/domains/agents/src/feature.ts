import { pieceAssignmentWork } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { resourceOwner } from "@antumbra/domain-reclamation/rows/resource-owner.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { voyageCaptainWork } from "@antumbra/domain-voyages/rows/voyage-captain-work.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { retire } from "#commands/retire.ts";
import { agentRetired } from "#facts/agent-retired.ts";
import { agentRetiredMaterializer } from "#materializers/agent-retired.ts";
import { all } from "#queries/all.ts";
import { authority } from "#queries/authority.ts";
import { byId } from "#queries/by-id.ts";
import { byPiece } from "#queries/by-piece.ts";
import { bySession } from "#queries/by-session.ts";
import { byVoyage } from "#queries/by-voyage.ts";
import { captain } from "#queries/captain.ts";
import { captain as captainView } from "#queries/captain-reading.ts";
import { dueRetirements } from "#queries/due-retirements.ts";
import { dueSiestas } from "#queries/due-siestas.ts";
import { reading } from "#queries/reading.ts";
import { roster } from "#queries/roster.ts";
import { smoother } from "#queries/smoother.ts";
import { workingCount } from "#queries/working-count.ts";
import { agent } from "#rows/agent.ts";
import { agentReading } from "#rows/agent-reading.ts";
import { captainReading } from "#rows/captain-reading.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const agents = feature("agents", {
	rows: [
		count,
		flag,
		pieceProgress,
		captainReading,
		agentReading,
		resourceOwner,
		pieceAssignmentWork,
		voyageCaptainWork,
		agent,
		pieceAgent,
		voyageAgent,
		session,
		sessionOperation,
		voyage,
	],
	facts: [agentRetired],
	commands: [retire],
	materializers: [agentRetiredMaterializer],
	queries: [
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
	],
});
