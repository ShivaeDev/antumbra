import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
import { defineService } from "@shivaedev/service/defineService.ts";
import { clear } from "#clear.ts";
import { pending } from "#pending.ts";
import { record } from "#record.ts";
export const Lifecycle = defineService({
	id: "@antumbra/server-lifecycle/Lifecycle",
	requires: [Records, ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ record, clear, pending }),
});
