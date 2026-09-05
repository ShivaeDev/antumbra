import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { read } from "#execution/read.ts";

export const ExecutionSource = defineService({
	id: "@antumbra/domain/ExecutionSource",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [Changes, Database, Rulings],
});
