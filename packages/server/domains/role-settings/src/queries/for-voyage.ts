import { query } from "@antumbra/feature/query.ts";
import { Effect, Schema } from "effect";
import { roleSetting } from "#rows/role-setting.ts";

export const forVoyage = query("forVoyage", {
	input: { voyageId: Schema.String },
	output: Schema.Array(roleSetting.Row),
	reads: [roleSetting],
	scope: (input) => input.voyageId,
	run: Effect.fn("roleSettings.forVoyage")(function* (input, rows) {
		return yield* rows.roleSetting.where({ scope: input.voyageId });
	}),
});
