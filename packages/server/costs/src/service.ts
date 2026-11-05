import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { forAgent } from "#queries/for-agent.ts";
import { forVoyage } from "#queries/for-voyage.ts";
import { reading } from "#queries/reading.ts";
export const Costs = defineService({
	id: "@antumbra/server-costs/Costs",
	requires: [Records, ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ reading, forVoyage, forAgent }),
});
