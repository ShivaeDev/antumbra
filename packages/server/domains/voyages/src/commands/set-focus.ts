import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { focusSet } from "#facts/focus-set.ts";
import { VoyageId } from "#ids.ts";
import { voyage } from "#rows/voyage.ts";

export const setFocus = command("setFocus", {
	input: { id: VoyageId, focused: Schema.Boolean },
	reads: [voyage],
	emits: focusSet,
	rejections: { Unknown: { id: Schema.String } },
});
