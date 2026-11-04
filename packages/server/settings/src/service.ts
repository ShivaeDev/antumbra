import { SettingsHistory } from "@antumbra/server-journal/postgres/settings/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { setCount } from "#commands/set-count.ts";
import { setFlag } from "#commands/set-flag.ts";
import { initialize } from "#initialize.ts";
import { counts } from "#queries/counts.ts";
import { flags } from "#queries/flags.ts";
export const Settings = defineService({
	id: "@antumbra/server-settings/Settings",
	requires: [SettingsHistory],
	initialize: initialize,
	methods: (serial) => ({
		setFlag: setFlag(serial),
		setCount: setCount(serial),
		flags,
		counts,
	}),
});
