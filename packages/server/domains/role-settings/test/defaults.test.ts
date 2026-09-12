import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";
import { FLEET, roleSettingId } from "#ids.ts";

it.app("includes unchosen roles in fleet defaults", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: "claude", effort: "high", model: null, role: "captain", scope: FLEET });

	expect(yield* answered(roles.defaults({}))).toEqual([
		{ backend: null, effort: null, id: `${FLEET}/flagship`, model: null, role: "flagship", scope: FLEET },
		{ backend: "claude", effort: "high", id: `${FLEET}/captain`, model: null, role: "captain", scope: FLEET },
		{ backend: null, effort: null, id: `${FLEET}/crew`, model: null, role: "crew", scope: FLEET },
		{ backend: null, effort: null, id: `${FLEET}/smoother`, model: null, role: "smoother", scope: FLEET },
	]);
});

it.app("stores an empty choice", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: null, effort: null, model: null, role: "crew", scope: FLEET });

	expect(yield* app.rows.roleSetting.get(roleSettingId(FLEET, "crew"))).toEqual({
		backend: null,
		effort: null,
		id: `${FLEET}/crew`,
		model: null,
		role: "crew",
		scope: FLEET,
	});
});
