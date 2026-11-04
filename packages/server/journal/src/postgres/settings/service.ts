import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";

import { append, checkRequest, read, readRows, rebuild } from "#postgres/settings/append.ts";
import { initialize } from "#postgres/settings/initialize.ts";
export const SettingsHistory = defineService({
	id: "@antumbra/server-journal/SettingsHistory",
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
