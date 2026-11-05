import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { smoothingRequested } from "#facts/smoothing-requested.ts";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";

export const smooth = command("smooth", {
	input: { agentId: AgentId, sessionId: SessionId, voyageId: VoyageId, cwd: Schema.NullOr(Schema.String) },
	reads: [voyageAgent, agent, session, birth, voyage],
	emits: smoothingRequested,
	rejections: {
		UnknownVoyage: { id: Schema.String },
		WrongAgent: { id: Schema.String },
		Busy: { agentId: Schema.String },
		SessionExists: { id: Schema.String },
	},
});
