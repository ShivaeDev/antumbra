import { catalog as query } from "@antumbra/domain-backends/queries/catalog.ts";
import { BackendsHistory } from "@antumbra/server-journal/postgres/backends/service.ts";
import { Effect, type Schema } from "effect";
export const catalog = Effect.fn("Backends.catalog")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* BackendsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
