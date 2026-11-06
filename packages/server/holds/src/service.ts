import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
import { defineService } from "@shivaedev/service/defineService.ts";
import { queues } from "#queues.ts";
export const Holds = defineService({
	id: "@antumbra/server-holds/Holds",
	requires: [Records, ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ queues }),
});
