import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
import { append, read, rebuild } from "#voyages/append.ts";
import { initialize } from "#voyages/initialize.ts";
import { byId, list, progress, roles } from "#voyages/read.ts";

export const VoyageHistory = defineService({
	id: "@antumbra/server-storage/VoyageHistory",
	requires: [Records, ExecutionDefinition, SqlClient.SqlClient, Reactivity.Reactivity],
	initialize: initialize,
	methods: (history) => ({ append: append(history), read: read(history), rebuild: rebuild(history), byId, list, progress, roles }),
});
