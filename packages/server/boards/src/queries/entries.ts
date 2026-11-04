import { entries as query } from "@antumbra/domain-boards/queries/entries.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Effect, type Schema } from "effect";
export const entries = Effect.fn("Boards.entries")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* BoardsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
