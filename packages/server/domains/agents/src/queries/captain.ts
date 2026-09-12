import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const captain = query("captain", {
	input: { voyageId: VoyageId },
	output: Schema.NullOr(agent.Row),
	reads: [agent, pieceAgent, voyageAgent],
	run: Effect.fn("Agents.captain")(function* (input, rows) {
		const links = yield* rows.voyageAgent.where({ voyageId: input.voyageId, role: "captain" });
		const assigned = new Set((yield* rows.pieceAgent.where({})).map((link) => link.agentId));
		const ids = new Set(links.filter((link) => !assigned.has(link.agentId)).map((link) => link.agentId));
		const candidates = (yield* rows.agent.where({})).filter((held) => ids.has(held.id)).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
		return candidates.find((held) => held.status === "spawning" || held.status === "alive") ?? candidates.at(-1) ?? null;
	}),
});
