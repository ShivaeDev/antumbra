import { loopFailed } from "@antumbra/domain-supervision/commands/loop-failed.ts";
import { loopForgotten } from "@antumbra/domain-supervision/commands/loop-forgotten.ts";
import { loopResumed } from "@antumbra/domain-supervision/commands/loop-resumed.ts";
import { Schema } from "effect";
export const Events = Schema.Union([
	Schema.TaggedStruct("LoopFailed", { ...loopFailed.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("LoopForgotten", { ...loopForgotten.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("LoopResumed", { ...loopResumed.payload, at: Schema.Number, sequence: Schema.Number }),
]);
