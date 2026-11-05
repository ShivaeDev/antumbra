import { command } from "@antumbra/platform-feature/command.ts";
import { BirthId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { birthHeld } from "#facts/birth-held.ts";
import { birth } from "#rows/birth.ts";
export const hold = command("hold", {
	input: { id: BirthId, reason: Schema.String },
	reads: [birth],
	emits: birthHeld,
	rejections: { Unavailable: { id: Schema.String } },
});
