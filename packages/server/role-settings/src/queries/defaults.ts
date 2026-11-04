import { defaults as query } from "@antumbra/domain-role-settings/queries/defaults.ts";
import { RoleSettingsHistory } from "@antumbra/server-journal/postgres/role-settings/service.ts";
import { Effect, type Schema } from "effect";
export const defaults = Effect.fn("RoleSettings.defaults")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* RoleSettingsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
