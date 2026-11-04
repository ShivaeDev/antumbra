import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { clear } from "#commands/clear.ts";
import { record } from "#commands/record.ts";
import { pending } from "#queries/pending.ts";
export const Lifecycle = defineService({
	id: "@antumbra/server-lifecycle/Lifecycle",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ record, clear, pending }),
});
