import { smoothingTargets as query } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { BoardsHistory } from "@antumbra/server-journal/postgres/boards/service.ts";
import { Effect, type Schema } from "effect";
export const smoothingTargets = Effect.fn("Boards.smoothingTargets")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* BoardsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
