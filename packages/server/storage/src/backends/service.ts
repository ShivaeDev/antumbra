import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { append, checkRequest, read, readRows, rebuild } from "#backends/append.ts";
import { initialize } from "#backends/initialize.ts";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";

export const BackendsHistory = defineService({
	id: "@antumbra/server-storage/BackendsHistory",
	requires: [ExecutionDefinition, Records, SqlClient.SqlClient, Reactivity.Reactivity],
	initialize: initialize,
	methods: (state) => ({
		checkRequest: checkRequest,
		append: append(state),
		read: read(state),
		rebuild: rebuild(state),
		rows: readRows(state),
	}),
});
