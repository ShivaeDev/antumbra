import { smoothingState as query } from "@antumbra/domain-boards/queries/smoothing-state.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Effect, type Schema } from "effect";
export const smoothingState = Effect.fn("Boards.smoothingState")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* BoardsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
