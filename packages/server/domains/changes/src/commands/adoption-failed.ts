import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeAdoptionFailedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const adoptionFailed = fact("ChangeAdoptionFailed", ChangeAdoptionFailedPayload.fields);
export const failAdoption = command("failAdoption", {
	input: { id: Schema.String, url: Schema.String, message: Schema.String },
	reads: [adoptionRequest],
	emits: adoptionFailed,
	rejections: {},
});
