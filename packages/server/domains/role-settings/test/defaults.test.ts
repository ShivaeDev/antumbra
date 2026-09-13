import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";
import { FLEET, roleSettingId } from "#ids.ts";

it.app("includes unchosen roles in fleet defaults and says what each resolves to", function* (app) {
	const roles = app.api.roleSettings;
	yield* app.api.backends.listModels({
		backend: "claude",
		failure: null,
		models: [{ defaultEffort: "high", efforts: ["low", "high"], isDefault: true, model: "opus", name: "Opus" }],
	});
	yield* roles.choose({ backend: "claude", effort: "high", model: null, role: "captain", scope: FLEET });

	expect(yield* answered(roles.defaults({}))).toMatchObject([
		{ backend: null, effort: null, id: `${FLEET}/flagship`, model: null, role: "flagship", scope: FLEET },
		{ backend: "claude", effort: "high", id: `${FLEET}/captain`, model: null, role: "captain", scope: FLEET },
		{ backend: null, effort: null, id: `${FLEET}/crew`, model: null, role: "crew", scope: FLEET },
		{ backend: null, effort: null, id: `${FLEET}/smoother`, model: null, role: "smoother", scope: FLEET },
	]);

	const listed = yield* answered(roles.defaults({}));
	expect(listed.find((row) => row.role === "captain")?.resolved).toEqual({
		backend: { source: "chosen", value: "claude" },
		effort: { source: "chosen", value: "high" },
		model: { source: "backend", value: "opus" },
	});
	expect(listed.find((row) => row.role === "crew")?.resolved).toEqual({
		backend: { source: "backend", value: "claude" },
		effort: { source: "backend", value: "high" },
		model: { source: "backend", value: "opus" },
	});
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
