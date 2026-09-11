import { roleSettingId } from "@antumbra/domain-role-settings/ids.ts";
import { roleSetting } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { VOYAGE_AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Effect } from "effect";
import { voyageOpened } from "#facts/voyage-opened.ts";
import { voyage } from "#rows/voyage.ts";

export const voyageOpenedMaterializer = materializer(voyageOpened, {
	writes: [voyage, roleSetting],
	run: Effect.fn("voyages.VoyageOpened")(function* (fact, rows) {
		yield* rows.voyage.insert({
			context: fact.context,
			focusedAt: null,
			id: fact.id,
			kind: fact.kind,
			name: fact.name,
			northStar: fact.northStar,
			openedAt: fact.openedAt,
		});
		for (const role of VOYAGE_AGENT_ROLES) {
			const chosen = role === "captain" ? fact.captain : fact.crew;
			yield* rows.roleSetting.insert({
				backend: chosen.backend,
				effort: chosen.effort,
				id: roleSettingId(fact.id, role),
				model: chosen.model,
				role,
				scope: fact.id,
			});
		}
	}),
});
