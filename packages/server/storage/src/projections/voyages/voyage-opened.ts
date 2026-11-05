import type { voyageOpened } from "@antumbra/domain-voyages/facts/voyage-opened.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { VOYAGE_AGENT_ROLES } from "@antumbra/platform-vocabulary/agent-role.ts";
import { roleSettingId } from "@antumbra/platform-vocabulary/role-settings-ids.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const voyageOpenedMaterializer = Effect.fn("voyages.VoyageOpened")(function* (
	fact: FactValue<typeof voyageOpened>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.voyage
		.insertVoid({
			context: fact.context,
			focusedAt: null,
			id: fact.id,
			kind: fact.kind,
			name: fact.name,
			northStar: fact.northStar,
			openedAt: fact.openedAt,
			quietedAt: null,
		})
		.pipe(Effect.orDie);
	for (const role of VOYAGE_AGENT_ROLES) {
		const chosen = role === "captain" ? fact.captain : fact.crew;
		yield* rows.roleSetting
			.insertVoid({
				backend: chosen.backend,
				effort: chosen.effort,
				id: roleSettingId(fact.id, role),
				model: chosen.model,
				role,
				scope: fact.id,
			})
			.pipe(Effect.orDie);
	}
});
