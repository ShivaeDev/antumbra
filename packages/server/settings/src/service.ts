import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { SettingsHistory } from "@antumbra/server-storage/settings/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { setCount } from "#commands/set-count.ts";
import { setFlag } from "#commands/set-flag.ts";
import { initialize } from "#initialize.ts";
import { counts } from "#queries/counts.ts";
import { flags } from "#queries/flags.ts";
export const Settings = defineService({
	id: "@antumbra/server-settings/Settings",
	requires: [ExecutionHistory, Records, SettingsHistory],
	initialize: initialize,
	methods: (serial) => ({
		setFlag: setFlag(serial),
		setCount: setCount(serial),
		flags,
		counts,
	}),
});
