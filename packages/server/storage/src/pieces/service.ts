import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { ExecutionDefinition } from "#execution/definition.ts";
import { append, checkRequest, read, rebuild } from "#pieces/append.ts";
import { initialize } from "#pieces/initialize.ts";
import { all, byId, edges, evidence, members, progress } from "#pieces/read.ts";
import { Records } from "#records.ts";

export const PieceHistory = defineService({
	id: "@antumbra/server-storage/PieceHistory",
	requires: [Records, ExecutionDefinition, SqlClient.SqlClient, Reactivity.Reactivity],
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
