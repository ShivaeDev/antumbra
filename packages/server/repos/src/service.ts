import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { ReposHistory } from "@antumbra/server-storage/repos/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { forget } from "#commands/forget.ts";
import { register } from "#commands/register.ts";
import { initialize } from "#initialize.ts";
import { all } from "#queries/all.ts";
import { byId } from "#queries/by-id.ts";
import { byIds } from "#queries/by-ids.ts";
export const Repos = defineService({
	id: "@antumbra/server-repos/Repos",
	requires: [ExecutionHistory, Records, ReposHistory],
	initialize: initialize,
	methods: (serial) => ({ register: register(serial), forget: forget(serial), all, byId, byIds }),
});
