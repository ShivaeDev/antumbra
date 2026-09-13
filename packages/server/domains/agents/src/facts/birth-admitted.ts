import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { BirthId } from "#ids.ts";
import { birth } from "#rows/birth.ts";

export const birthAdmitted = fact("BirthAdmitted", {
	id: BirthId,
	backend: Schema.String,
	model: Schema.String,
	effort: birth.fields.effort,
});
