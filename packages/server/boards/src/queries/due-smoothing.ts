import { dueSmoothing as query } from "@antumbra/domain-boards/queries/due-smoothing.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Effect, type Schema } from "effect";
export const dueSmoothing = Effect.fn("Boards.dueSmoothing")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* BoardsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
