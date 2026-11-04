import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { ExecutionHistory } from "#postgres/execution/service.ts";
import { append, checkRequest, read, readRows, rebuild } from "#postgres/inputs/append.ts";
export const InputsHistory = defineService({
	id: "@antumbra/server-journal/InputsHistory",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ checkRequest, append, read, rebuild, rows: readRows }),
});
