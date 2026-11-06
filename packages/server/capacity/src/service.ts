import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
import { defineService } from "@shivaedev/service/defineService.ts";
import { observe } from "#observe.ts";
import { providers } from "#providers.ts";
import { release } from "#release.ts";
export const Capacity = defineService({
	id: "@antumbra/server-capacity/Capacity",
	requires: [Records, ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ observe, release, providers }),
});
