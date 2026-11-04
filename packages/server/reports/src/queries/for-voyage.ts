import { forVoyage as query } from "@antumbra/domain-reports/queries/for-voyage.ts";
import { ReportsHistory } from "@antumbra/server-journal/postgres/reports/service.ts";
import { Effect, type Schema } from "effect";
export const forVoyage = Effect.fn("Reports.forVoyage")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ReportsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
