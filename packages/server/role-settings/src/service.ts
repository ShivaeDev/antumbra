import { RoleSettingsHistory } from "@antumbra/server-journal/postgres/role-settings/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { choose } from "#commands/choose.ts";
import { initialize } from "#initialize.ts";
import { defaults } from "#queries/defaults.ts";
import { forVoyage } from "#queries/for-voyage.ts";
import { resolve } from "#queries/resolve.ts";
export const RoleSettings = defineService({
	id: "@antumbra/server-role-settings/RoleSettings",
	requires: [RoleSettingsHistory],
	initialize: initialize,
	methods: (serial) => ({
		choose: choose(serial),
		defaults,
		forVoyage,
		resolve,
	}),
});
