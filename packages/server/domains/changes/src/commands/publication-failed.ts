import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangePublicationFailedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Schema } from "effect";
import { change } from "#rows/change.ts";
export const publicationFailed = fact("ChangePublicationFailed", ChangePublicationFailedPayload.fields);
export const failPublication = command("failPublication", {
	input: { changeId: ChangeId, attemptId: Schema.String, message: Schema.String },
	reads: [change],
	emits: publicationFailed,
	rejections: {},
});
