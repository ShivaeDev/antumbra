import type * as Source from "@antumbra/domain-costs/queries/reading.ts";
import { costsView } from "@antumbra/domain-costs/queries/view.ts";
import { selection as sessionUsageSelection } from "@antumbra/server-storage/records/session-usage.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const reading = Effect.fn("Costs.reading")(function* (
	input: Schema.Struct.Type<typeof Source.reading.input>,
): Effect.fn.Return<typeof Source.reading.output.Type, never, Records> {
	const rows = yield* Records;

	const readings = yield* rows.sessionUsage
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionUsageSelection })
		.pipe(Effect.orDie);
	const crews = yield* rows.voyageAgent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
		.pipe(Effect.orDie);
	const voyages = yield* rows.voyage
		.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
		.pipe(Effect.orDie);
	return costsView({
		now: new Date(`${input.today}T12:00:00`),
		readings,
		sessions: new Map(readings.map((row) => [row.sessionId, row])),
		voyageOfAgent: new Map(crews.map((crew) => [crew.agentId, crew.voyageId])),
		voyageNames: new Map(voyages.map((voyage) => [voyage.id, voyage.name])),
	});
});
