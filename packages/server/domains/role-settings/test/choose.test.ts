import { expect } from "vitest";
import { FLEET, roleSettingId } from "#ids.ts";
import { it } from "#test/kit.ts";

it.app("a second choice for a role replaces the row rather than adding one", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: "codex", effort: "medium", model: "gpt-5", role: "crew", scope: FLEET });
	yield* roles.choose({ backend: "claude", effort: "high", model: "opus", role: "crew", scope: FLEET });

	expect(yield* app.rows.roleSetting.count({ scope: FLEET })).toBe(1);
	expect(yield* app.rows.roleSetting.get(roleSettingId(FLEET, "crew"))).toMatchObject({
		backend: "claude",
		effort: "high",
		model: "opus",
	});
});
