import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { ExecutionDefinition } from "#execution/definition.ts";
import { Records } from "#records.ts";

import { append, checkRequest, read, readRows, rebuild } from "#settings/append.ts";
import { initialize } from "#settings/initialize.ts";
export const SettingsHistory = defineService({
	id: "@antumbra/server-storage/SettingsHistory",
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
