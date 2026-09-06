import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { read } from "#tree/read.ts";

export const SessionTrees = defineService({
	id: "@antumbra/sessions/SessionTrees",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [Database],
});
