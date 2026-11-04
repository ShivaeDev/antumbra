import { browse as query } from "@antumbra/domain-changes/queries/browse.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { Effect, type Schema } from "effect";
export const browse = Effect.fn("Changes.browse")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ChangesHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
