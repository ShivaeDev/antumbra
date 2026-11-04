import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";

import { append, checkRequest, read, readRows, rebuild } from "#postgres/inputs/append.ts";
import { initialize } from "#postgres/inputs/initialize.ts";
export const InputsHistory = defineService({
	id: "@antumbra/server-journal/InputsHistory",
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
