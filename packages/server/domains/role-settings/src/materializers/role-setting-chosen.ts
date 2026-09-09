import { materializer } from "@antumbra/feature/materializer.ts";
import { Effect, Option } from "effect";
import { roleSettingChosen } from "#facts/role-setting-chosen.ts";
import { roleSettingId } from "#ids.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const roleSettingChosenMaterializer = materializer(roleSettingChosen, {
	writes: [roleSetting],
	run: Effect.fn("roleSettings.RoleSettingChosen")(function* (fact, rows) {
		const id = roleSettingId(fact.scope, fact.role);
		const chosen = { backend: fact.backend, effort: fact.effort, id, model: fact.model, role: fact.role, scope: fact.scope };
		const stored = yield* rows.roleSetting.find(id);
		if (Option.isNone(stored)) {
			return yield* rows.roleSetting.insert(chosen);
		}
		yield* rows.roleSetting.update(id, chosen);
	}),
});
