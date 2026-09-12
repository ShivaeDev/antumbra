import { FLEET, roleSettingId } from "@antumbra/domain-role-settings/ids.ts";
import { expect } from "vitest";
import { it } from "#testing/entry.ts";

it.app("replaces an existing choice", function* (app) {
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
