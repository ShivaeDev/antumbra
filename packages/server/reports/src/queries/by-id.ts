import { byId as query } from "@antumbra/domain-reports/queries/by-id.ts";
import { ReportsHistory } from "@antumbra/server-journal/postgres/reports/service.ts";
import { Effect, type Schema } from "effect";
export const byId = Effect.fn("Reports.byId")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ReportsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
