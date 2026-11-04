import { resolve as query } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { RoleSettingsHistory } from "@antumbra/server-journal/postgres/role-settings/service.ts";
import { Effect, type Schema } from "effect";
export const resolve = Effect.fn("RoleSettings.resolve")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* RoleSettingsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
