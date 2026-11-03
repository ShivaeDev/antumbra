import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { append, checkRequest, read, rebuild } from "#postgres/mail/append.ts";
import { initialize } from "#postgres/mail/initialize.ts";
import { all, byId, wakeEvidence } from "#postgres/mail/read.ts";

export const MailHistory = defineService({
	id: "@antumbra/server-journal/MailHistory",
	requires: [SqlClient.SqlClient, Reactivity.Reactivity],
	initialize: initialize,
	methods: (history) => ({
		append: append(history),
		checkRequest: checkRequest(history),
		read: read(history),
		rebuild: rebuild(history),
		all,
		byId,
		wakeEvidence,
	}),
});
