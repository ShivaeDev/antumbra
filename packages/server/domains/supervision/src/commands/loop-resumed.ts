import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";

export const loopResumed = fact("LoopResumed", { loop: Schema.String });

export const resumeLoop = command("resumeLoop", {
	input: { loop: Schema.String },
	reads: [],
	emits: loopResumed,
	rejections: {},
});
