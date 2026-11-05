import { command } from "@antumbra/platform-feature/command.ts";
import { BirthId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { birthRetried } from "#facts/birth-retried.ts";
import { birth } from "#rows/birth.ts";
export const retry = command("retry", {
	input: { id: BirthId },
	reads: [birth],
	emits: birthRetried,
	rejections: { Unknown: { id: Schema.String }, NotAllowed: { id: Schema.String, status: Schema.String } },
});
