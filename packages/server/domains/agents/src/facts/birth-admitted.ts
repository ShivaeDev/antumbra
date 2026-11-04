import { fact } from "@antumbra/platform-feature/fact.ts";
import { BirthId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { birth } from "#rows/birth.ts";

export const birthAdmitted = fact("BirthAdmitted", {
	id: BirthId,
	backend: Schema.String,
	model: Schema.String,
	effort: birth.fields.effort,
});
