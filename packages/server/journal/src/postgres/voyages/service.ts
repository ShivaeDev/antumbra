import { defineService } from "@shivaedev/service/defineService.ts";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { append, read, rebuild } from "#postgres/voyages/append.ts";
import { initialize } from "#postgres/voyages/initialize.ts";
import { byId, list, progress, roles } from "#postgres/voyages/read.ts";

export const VoyageHistory = defineService({
	id: "@antumbra/server-journal/VoyageHistory",
	requires: [SqlClient.SqlClient, Reactivity.Reactivity],
	initialize: initialize,
	methods: (history) => ({ append: append(history), read: read(history), rebuild: rebuild(history), byId, list, progress, roles }),
});
