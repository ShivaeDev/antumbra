import { links as query } from "@antumbra/domain-changes/queries/links.ts";
import { ChangesHistory } from "@antumbra/server-journal/postgres/changes/service.ts";
import { Effect, type Schema } from "effect";
export const links = Effect.fn("Changes.links")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* ChangesHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
