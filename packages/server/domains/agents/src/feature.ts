import { pieceAssignmentWork } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { resourceOwner } from "@antumbra/domain-reclamation/rows/resource-owner.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { voyageCaptainWork } from "@antumbra/domain-voyages/rows/voyage-captain-work.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { retire } from "#commands/retire.ts";
import { agentRetired } from "#facts/agent-retired.ts";
import { agentRetiredMaterializer } from "#materializers/agent-retired.ts";
import { all } from "#queries/all.ts";
import { authority } from "#queries/authority.ts";
import { byId } from "#queries/by-id.ts";
import { captain } from "#queries/captain.ts";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const agents = feature("agents", {
	rows: [resourceOwner, pieceAssignmentWork, voyageCaptainWork, agent, pieceAgent, voyageAgent, session, sessionOperation, voyage],
	facts: [agentRetired],
	commands: [retire],
	materializers: [agentRetiredMaterializer],
	queries: [all, byId, captain, authority],
});
