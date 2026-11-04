import { smoothingSessionFor as query } from "@antumbra/domain-boards/queries/smoothing-session-for.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Effect, type Schema } from "effect";
export const smoothingSessionFor = Effect.fn("Boards.smoothingSessionFor")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* BoardsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
