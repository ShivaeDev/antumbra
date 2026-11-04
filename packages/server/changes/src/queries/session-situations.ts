import { sessionSituations as query } from "@antumbra/domain-changes/queries/session-situations.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { Effect, type Schema } from "effect";
export const sessionSituations = Effect.fn("Changes.sessionSituations")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ChangesHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
