import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { observe } from "#commands/observe.ts";
import { release } from "#commands/release.ts";
import { providers } from "#queries/providers.ts";
export const Capacity = defineService({
	id: "@antumbra/server-capacity/Capacity",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ observe, release, providers }),
});
