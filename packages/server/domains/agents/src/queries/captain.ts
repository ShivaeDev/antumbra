import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const captain = query("captain", {
	input: { voyageId: VoyageId },
	output: Schema.NullOr(agent.Row),
	reads: [agent, pieceAgent, voyageAgent, session],
});
