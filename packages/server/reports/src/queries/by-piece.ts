import { byPiece as query } from "@antumbra/domain-reports/queries/by-piece.ts";
import { ReportsHistory } from "@antumbra/server-journal/postgres/reports/service.ts";
import { Effect, type Schema } from "effect";
export const byPiece = Effect.fn("Reports.byPiece")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ReportsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
