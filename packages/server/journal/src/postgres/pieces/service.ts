import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { append, checkRequest, read, rebuild } from "#postgres/pieces/append.ts";
import { initialize } from "#postgres/pieces/initialize.ts";
import { all, byId, edges, evidence, members, progress } from "#postgres/pieces/read.ts";

export const PieceHistory = defineService({
	id: "@antumbra/server-journal/PieceHistory",
	requires: [SqlClient.SqlClient, Reactivity.Reactivity],
	initialize: initialize,
	methods: (history) => ({
		append: append(history),
		checkRequest: checkRequest(history),
		read: read(history),
		rebuild: rebuild(history),
		all,
		byId,
		edges,
		evidence,
		members,
		progress,
	}),
});
