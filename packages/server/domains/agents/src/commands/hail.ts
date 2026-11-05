import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { birthRequested } from "#facts/birth-requested.ts";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";

export const hail = command("hail", {
	input: { voyageId: VoyageId, by: Schema.Literals(["admiral", "agent"]) },
	reads: [agent, pieceAgent, voyageAgent, session, voyage],
	emits: birthRequested,
	rejections: {
		UnknownVoyage: { id: Schema.String },
		CaptainAlreadyHailed: { agentId: Schema.String },
		CaptainSessionUnavailable: { agentId: Schema.String },
		CaptainStopped: { agentId: Schema.String },
		VoyageQuiet: { agentId: Schema.String },
		AgentExists: { id: Schema.String },
	},
});
