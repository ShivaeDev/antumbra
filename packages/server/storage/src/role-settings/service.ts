import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";

import { append, checkRequest, read, readRows, rebuild } from "#role-settings/append.ts";
import { initialize } from "#role-settings/initialize.ts";
export const RoleSettingsHistory = defineService({
	id: "@antumbra/server-storage/RoleSettingsHistory",
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
