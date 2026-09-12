import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { sessionUsage } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { CostsView } from "@antumbra/domain-sessions/usage/schema.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { costsView } from "#view.ts";

export const reading = query("reading", {
	input: { today: Schema.String },
	output: CostsView,
	reads: [sessionUsage, voyageAgent, voyage],
	run: Effect.fn("Costs.reading")(function* (input, rows) {
		const readings = yield* rows.sessionUsage.where({});
		const crews = yield* rows.voyageAgent.where({});
		const voyages = yield* rows.voyage.where({});
		return costsView({
			now: new Date(`${input.today}T12:00:00`),
			readings,
			sessions: new Map(readings.map((row) => [row.sessionId, row])),
			voyageOfAgent: new Map(crews.map((crew) => [crew.agentId, crew.voyageId])),
			voyageNames: new Map(voyages.map((voyage) => [voyage.id, voyage.name])),
		});
	}),
});
