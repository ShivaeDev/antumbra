import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { append, checkRequest, read, readRows, rebuild } from "#boards/append.ts";
import { initialize } from "#boards/initialize.ts";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";
export const BoardsHistory = defineService({
	id: "@antumbra/server-storage/BoardsHistory",
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
