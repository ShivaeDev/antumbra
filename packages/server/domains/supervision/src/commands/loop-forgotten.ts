import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";

export const loopForgotten = fact("LoopForgotten", { loop: Schema.String });

export const forgetLoop = command("forgetLoop", {
	input: { loop: Schema.String },
	reads: [],
	emits: loopForgotten,
	rejections: {},
});
