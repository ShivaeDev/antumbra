import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";

export const smoothingFinished = fact("SmoothingFinished", {
	id: Schema.String,
	status: Schema.Literals(["succeeded", "failed"]),
	detail: Schema.NullOr(Schema.String),
});
