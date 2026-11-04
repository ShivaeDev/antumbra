import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { forget } from "#commands/forget.ts";
import { register } from "#commands/register.ts";
import { initialize } from "#initialize.ts";
import { observeReferences } from "#observe-references.ts";
import { all } from "#queries/all.ts";
import { byId } from "#queries/by-id.ts";
import { byIds } from "#queries/by-ids.ts";
export const Repos = defineService({
	id: "@antumbra/server-repos/Repos",
	requires: [ReposHistory],
	initialize: initialize,
	methods: (serial) => ({ observeReferences: observeReferences(serial), register: register(serial), forget: forget(serial), all, byId, byIds }),
});
