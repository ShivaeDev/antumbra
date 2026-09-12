import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
import { atWork } from "#work.ts";
export const captain = query("captain", {
	input: { voyageId: VoyageId },
	output: Schema.NullOr(agent.Row),
	reads: [agent, pieceAgent, voyageAgent, session],
	run: Effect.fn("Agents.captain")(function* (input, rows) {
		const links = yield* rows.voyageAgent.where({ voyageId: input.voyageId, role: "captain" });
		const assigned = new Set((yield* rows.pieceAgent.where({})).map((link) => link.agentId));
		const ids = new Set(links.filter((link) => !assigned.has(link.agentId)).map((link) => link.agentId));
		const candidates = (yield* rows.agent.where({})).filter((held) => ids.has(held.id)).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
		const sessions = yield* rows.session.where({ parentSessionId: null, status: "open" });
		return candidates.find((held) => atWork(held, sessions)) ?? candidates.at(-1) ?? null;
	}),
});
