import { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { choose } from "#commands/choose.ts";
import { roleSettingChosen } from "#facts/role-setting-chosen.ts";
import { roleSettingChosenMaterializer } from "#materializers/role-setting-chosen.ts";
import { defaults } from "#queries/defaults.ts";
import { forVoyage } from "#queries/for-voyage.ts";
import { resolve } from "#queries/resolve.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const roleSettings = feature("roleSettings", {
	rows: [roleSetting, backendModel],
	facts: [roleSettingChosen],
	commands: [choose],
	materializers: [roleSettingChosenMaterializer],
	queries: [defaults, forVoyage, resolve],
});
