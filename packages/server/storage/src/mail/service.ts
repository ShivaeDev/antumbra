import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { ExecutionDefinition } from "#execution/definition.ts";
import { append, checkRequest, read, rebuild } from "#mail/append.ts";
import { initialize } from "#mail/initialize.ts";
import { all, byId } from "#mail/read.ts";
import { Records } from "#records.ts";

export const MailHistory = defineService({
	id: "@antumbra/server-storage/MailHistory",
	requires: [Records, ExecutionDefinition, SqlClient.SqlClient, Reactivity.Reactivity],
	initialize: initialize,
	methods: (history) => ({
		append: append(history),
		checkRequest: checkRequest(history),
		read: read(history),
		rebuild: rebuild(history),
		all,
		byId,
	}),
});
