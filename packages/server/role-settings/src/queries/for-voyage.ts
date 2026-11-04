import { forVoyage as query } from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { RoleSettingsHistory } from "@antumbra/server-journal/postgres/role-settings/service.ts";
import { Effect, type Schema } from "effect";
export const forVoyage = Effect.fn("RoleSettings.forVoyage")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* RoleSettingsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
