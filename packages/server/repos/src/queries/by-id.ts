import { byId as query } from "@antumbra/domain-repos/queries/by-id.ts";
import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { Effect, type Schema } from "effect";
export const byId = Effect.fn("Repos.byId")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ReposHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
