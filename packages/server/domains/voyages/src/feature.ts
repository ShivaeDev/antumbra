import { roleSetting } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { open } from "#commands/open.ts";
import { setFocus } from "#commands/set-focus.ts";
import { focusSet } from "#facts/focus-set.ts";
import { voyageOpened } from "#facts/voyage-opened.ts";
import { focusSetMaterializer } from "#materializers/focus-set.ts";
import { voyageOpenedMaterializer } from "#materializers/voyage-opened.ts";
import { byId } from "#queries/by-id.ts";
import { list } from "#queries/list.ts";
import { voyage } from "#rows/voyage.ts";

export const voyages = feature("voyages", {
	rows: [voyage, roleSetting],
	facts: [voyageOpened, focusSet],
	commands: [open, setFocus],
	materializers: [voyageOpenedMaterializer, focusSetMaterializer],
	queries: [list, byId],
});
