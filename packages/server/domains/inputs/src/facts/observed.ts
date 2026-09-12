import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
export const inputObserved = fact("InputDeliveryObserved", {
	sessionId: Schema.String,
	inputId: Schema.String,
	operationId: Schema.String,
	status: Schema.Literals(["accepted", "ambiguous", "refused"]),
	detail: Schema.NullOr(Schema.String),
});
