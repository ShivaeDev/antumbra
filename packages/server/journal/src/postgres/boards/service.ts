import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";

import { append, checkRequest, read, readRows, rebuild } from "#postgres/boards/append.ts";
import { initialize } from "#postgres/boards/initialize.ts";
export const BoardsHistory = defineService({
	id: "@antumbra/server-journal/BoardsHistory",
	requires: [SqlClient.SqlClient, Reactivity.Reactivity],
	initialize: initialize,
	methods: (state) => ({
		checkRequest: checkRequest,
		append: append(state),
		read: read(state),
		rebuild: rebuild(state),
		rows: readRows(state),
	}),
});
