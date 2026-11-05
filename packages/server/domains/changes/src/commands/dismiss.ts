import { command } from "@antumbra/platform-feature/command.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Schema } from "effect";
import { changeDismissed } from "#facts/change-dismissed.ts";
import { change } from "#rows/change.ts";
export const dismiss = command("dismiss", {
	input: { changeId: ChangeId },
	reads: [change],
	emits: changeDismissed,
	rejections: { UnknownChange: { id: Schema.String }, ChangeStillAlive: { id: Schema.String, stage: Schema.String } },
});
