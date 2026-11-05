import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeAdoptionRetriedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const adoptionRetried = fact("ChangeAdoptionRetried", ChangeAdoptionRetriedPayload.fields);
export const retryAdoption = command("retryAdoption", {
	input: { id: Schema.String, url: titled(Schema.String, { title: "Pull request URL" }) },
	reads: [adoptionRequest],
	emits: adoptionRetried,
	rejections: { UnknownRequest: { id: Schema.String } },
});
