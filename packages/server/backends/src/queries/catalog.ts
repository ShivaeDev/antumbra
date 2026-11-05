import type { catalog as query } from "@antumbra/domain-backends/queries/catalog.ts";
import { catalog as queryDecision } from "@antumbra/server-backends/logic/queries/catalog.ts";
import { Effect, type Schema } from "effect";
export const catalog = Effect.fn("Backends.catalog")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	return yield* queryDecision(input);
});
