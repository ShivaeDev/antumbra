import { command } from "@antumbra/platform-feature/command.ts";
import { BirthId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { birthDelayed } from "#facts/birth-delayed.ts";
import { birth } from "#rows/birth.ts";
export const delay = command("delay", {
	input: { id: BirthId, reason: Schema.String },
	reads: [birth],
	emits: birthDelayed,
	rejections: { Unavailable: { id: Schema.String } },
});
