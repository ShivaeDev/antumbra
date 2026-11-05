import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { quietSet } from "#facts/quiet-set.ts";
import { VoyageId } from "#ids.ts";
import { voyage } from "#rows/voyage.ts";

export const quiet = command("quiet", {
	input: { id: VoyageId },
	reads: [voyage],
	emits: quietSet,
	rejections: { Unknown: { id: Schema.String } },
});
