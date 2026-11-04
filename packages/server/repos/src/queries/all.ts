import { all as query } from "@antumbra/domain-repos/queries/all.ts";
import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { Effect, type Schema } from "effect";
export const all = Effect.fn("Repos.all")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ReposHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
