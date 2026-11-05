import { it } from "@antumbra/app-testing/entry.ts";
import { roleSetting as roleSettingRecordSchema } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { FLEET, roleSettingId } from "@antumbra/platform-vocabulary/role-settings-ids.ts";
import { Effect, Schema } from "effect";
import { expect } from "vitest";

it.app("replaces an existing choice", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: "codex", effort: "medium", model: "gpt-5", role: "crew", scope: FLEET });
	yield* roles.choose({ backend: "claude", effort: "high", model: "opus", role: "crew", scope: FLEET });

	expect(yield* app.rows.roleSetting.count({ where: { scope: FLEET } }).pipe(Effect.orDie)).toBe(1);
	expect(
		yield* app.rows.roleSetting
			.findById(roleSettingId(FLEET, "crew"))
			.pipe(Effect.flatMap(Schema.decodeUnknownEffect(roleSettingRecordSchema.Row)), Effect.orDie),
	).toMatchObject({
		backend: "claude",
		effort: "high",
		model: "opus",
	});
});
