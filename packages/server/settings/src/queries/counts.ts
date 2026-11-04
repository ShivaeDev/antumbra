import { counts as query } from "@antumbra/domain-settings/queries/counts.ts";
import { SettingsHistory } from "@antumbra/server-journal/postgres/settings/service.ts";
import { Effect, type Schema } from "effect";
export const counts = Effect.fn("Settings.counts")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* SettingsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
