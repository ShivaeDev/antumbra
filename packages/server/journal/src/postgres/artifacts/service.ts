import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";

import { append, checkRequest, read, readRows, rebuild } from "#postgres/artifacts/append.ts";
import { initialize } from "#postgres/artifacts/initialize.ts";
export const ArtifactsHistory = defineService({
	id: "@antumbra/server-journal/ArtifactsHistory",
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
