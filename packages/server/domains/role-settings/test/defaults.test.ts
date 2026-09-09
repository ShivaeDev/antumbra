import { expect } from "vitest";
import { FLEET, roleSettingId } from "#ids.ts";
import { answered, it } from "#test/kit.ts";

it.app("answers the fleet's defaults with the rows that were chosen and nothing else", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: "claude", effort: "high", model: null, role: "captain", scope: FLEET });

	expect(yield* answered(roles.defaults({}))).toEqual([
		{ backend: "claude", effort: "high", id: `${FLEET}/captain`, model: null, role: "captain", scope: FLEET },
	]);
});

it.app("answers with nothing at all when the fleet has chosen nothing", function* (app) {
	expect(yield* answered(app.api.roleSettings.defaults({}))).toEqual([]);
});

it.app("stores a choice that names nothing as a row of nulls", function* (app) {
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
