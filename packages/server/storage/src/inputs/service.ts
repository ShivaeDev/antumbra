import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { ExecutionHistory } from "#execution/service.ts";
import { append, checkRequest, read, readRows, rebuild } from "#inputs/append.ts";
import { Records } from "#records.ts";
export const InputsHistory = defineService({
	id: "@antumbra/server-storage/InputsHistory",
	requires: [ExecutionHistory, Records],
	initialize: Effect.void,
	methods: () => ({ checkRequest, append, read, rebuild, rows: readRows }),
});
