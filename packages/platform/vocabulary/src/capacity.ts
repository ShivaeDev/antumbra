import { Schema } from "effect";

export const CapacityObservationFields = {
	backend: Schema.String,
	status: Schema.Literals(["available", "blocked", "warning"]),
	reason: Schema.NullOr(Schema.Literal("usage-limit")),
	detail: Schema.NullOr(Schema.String),
	observedAt: Schema.Number,
	resetsAt: Schema.NullOr(Schema.Number),
	utilization: Schema.NullOr(Schema.Number),
};
