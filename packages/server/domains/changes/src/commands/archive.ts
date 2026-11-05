import { command } from "@antumbra/platform-feature/command.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Schema } from "effect";
import { changeArchived } from "#facts/change-archived.ts";
import { change } from "#rows/change.ts";
export const archive = command("archive", {
	input: { changeId: ChangeId },
	reads: [change],
	emits: changeArchived,
	rejections: { UnknownChange: { id: Schema.String }, ChangeStillOpen: { id: Schema.String, stage: Schema.String } },
});
