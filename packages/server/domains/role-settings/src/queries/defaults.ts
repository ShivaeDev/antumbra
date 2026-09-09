import { query } from "@antumbra/feature/query.ts";
import { Effect, Schema } from "effect";
import { FLEET } from "#ids.ts";
import { roleSetting } from "#rows/role-setting.ts";

export const defaults = query("defaults", {
	input: {},
	output: Schema.Array(roleSetting.Row),
	reads: [roleSetting],
	scope: () => FLEET,
	run: Effect.fn("roleSettings.defaults")(function* (_input, rows) {
		return yield* rows.roleSetting.where({ scope: FLEET });
	}),
});
