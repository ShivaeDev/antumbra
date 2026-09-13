import { roleSetting } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { open } from "#commands/open.ts";
import { quiet } from "#commands/quiet.ts";
import { resume } from "#commands/resume.ts";
import { setFocus } from "#commands/set-focus.ts";
import { focusSet } from "#facts/focus-set.ts";
import { quietSet } from "#facts/quiet-set.ts";
import { voyageOpened } from "#facts/voyage-opened.ts";
import { focusSetMaterializer } from "#materializers/focus-set.ts";
import { quietSetMaterializer } from "#materializers/quiet-set.ts";
import { voyageOpenedMaterializer } from "#materializers/voyage-opened.ts";
import { byId } from "#queries/by-id.ts";
import { list } from "#queries/list.ts";
import { progress } from "#queries/progress.ts";
import { voyage } from "#rows/voyage.ts";
import { voyageActivity } from "#rows/voyage-activity.ts";
import { voyageCaptainWork } from "#rows/voyage-captain-work.ts";
import { voyagePieceProgress } from "#rows/voyage-piece-progress.ts";
import { voyageProgress } from "#rows/voyage-progress.ts";

export const voyages = feature("voyages", {
	rows: [voyageActivity, voyagePieceProgress, voyageCaptainWork, voyageProgress, voyage, roleSetting],
	facts: [voyageOpened, focusSet, quietSet],
	commands: [open, setFocus, quiet, resume],
	materializers: [voyageOpenedMaterializer, focusSetMaterializer, quietSetMaterializer],
	queries: [progress, list, byId],
});
