import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { queues } from "#queries/queues.ts";
export const Holds = defineService({
	id: "@antumbra/server-holds/Holds",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ queues }),
});
