import { command } from "@antumbra/platform-feature/command.ts";
import { BirthId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { birthCancelled } from "#facts/birth-cancelled.ts";
import { birth } from "#rows/birth.ts";
export const cancel = command("cancel", {
	input: { id: BirthId },
	reads: [birth],
	emits: birthCancelled,
	rejections: { Unknown: { id: Schema.String }, NotAllowed: { id: Schema.String, status: Schema.String } },
});
