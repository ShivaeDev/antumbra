import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";

export const loopFailed = fact("LoopFailed", { loop: Schema.String, message: Schema.String, trace: Schema.String });

export const failLoop = command("failLoop", {
	input: { loop: Schema.String, message: Schema.String, trace: Schema.String },
	reads: [],
	emits: loopFailed,
	rejections: {},
});
