import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { forAgent } from "#queries/for-agent.ts";
import { forVoyage } from "#queries/for-voyage.ts";
import { reading } from "#queries/reading.ts";
export const Costs = defineService({
	id: "@antumbra/server-costs/Costs",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ reading, forVoyage, forAgent }),
});
