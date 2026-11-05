import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { RoleSettingsHistory } from "@antumbra/server-storage/role-settings/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { choose } from "#commands/choose.ts";
import { initialize } from "#initialize.ts";
import { defaults } from "#queries/defaults.ts";
import { forVoyage } from "#queries/for-voyage.ts";
import { resolve } from "#queries/resolve.ts";
export const RoleSettings = defineService({
	id: "@antumbra/server-role-settings/RoleSettings",
	requires: [ExecutionHistory, Records, RoleSettingsHistory],
	initialize: initialize,
	methods: (serial) => ({
		choose: choose(serial),
		defaults,
		forVoyage,
		resolve,
	}),
});
