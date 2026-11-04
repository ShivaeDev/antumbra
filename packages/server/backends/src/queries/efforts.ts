import { efforts as query } from "@antumbra/domain-backends/queries/efforts.ts";
import { BackendsHistory } from "@antumbra/server-journal/postgres/backends/service.ts";
import { Effect, type Schema } from "effect";
export const efforts = Effect.fn("Backends.efforts")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* BackendsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
