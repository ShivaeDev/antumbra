import { deliveryReading as query } from "@antumbra/domain-inputs/queries/delivery.ts";
import { InputsHistory } from "@antumbra/server-journal/postgres/inputs/service.ts";
import { Effect, type Schema } from "effect";
export const deliveryReading = Effect.fn("Inputs.deliveryReading")(function* (input: Schema.Struct<typeof query.input>["Type"]) {
	const history = yield* InputsHistory;
	return yield* query.run(input, yield* history.rows(), {});
});
