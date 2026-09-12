import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const smoother = query("smoother", {
	input: { voyageId: VoyageId },
	output: Schema.NullOr(agent.Row),
	reads: [agent, voyageAgent],
	run: Effect.fn("Agents.smoother")(function* (input, rows) {
		const ids = new Set((yield* rows.voyageAgent.where({ voyageId: input.voyageId, role: "smoother" })).map((link) => link.agentId));
		return (
			(yield* rows.agent.where({}))
				.filter((value) => ids.has(value.id) && value.status !== "retired")
				.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))[0] ?? null
		);
	}),
});
