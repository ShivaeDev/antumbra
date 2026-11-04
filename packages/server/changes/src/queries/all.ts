import { all as query } from "@antumbra/domain-changes/queries/all.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { Effect, type Schema } from "effect";
export const all = Effect.fn("Changes.all")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ChangesHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
