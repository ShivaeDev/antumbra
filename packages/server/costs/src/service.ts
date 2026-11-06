import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
import { defineService } from "@shivaedev/service/defineService.ts";
import { forAgent } from "#for-agent.ts";
import { forVoyage } from "#for-voyage.ts";
import { reading } from "#reading.ts";
export const Costs = defineService({
	id: "@antumbra/server-costs/Costs",
	requires: [Records, ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ reading, forVoyage, forAgent }),
});
