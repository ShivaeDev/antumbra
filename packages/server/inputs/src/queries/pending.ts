import { pending as query } from "@antumbra/domain-inputs/queries/pending.ts";
import { InputsHistory } from "@antumbra/server-journal/postgres/inputs/service.ts";
import { Effect, type Schema } from "effect";
export const pending = Effect.fn("Inputs.pending")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* InputsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
