import { digest as query } from "@antumbra/domain-boards/queries/digest.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Effect, type Schema } from "effect";
export const digest = Effect.fn("Boards.digest")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* BoardsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
