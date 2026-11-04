import { restartCleared } from "@antumbra/domain-lifecycle/facts/restart-cleared.ts";
import { restartRecorded } from "@antumbra/domain-lifecycle/facts/restart-recorded.ts";
import { Schema } from "effect";
export const Events = Schema.Union([
	Schema.TaggedStruct("RestartRecorded", { ...restartRecorded.payload, at: Schema.Number, sequence: Schema.Number }),
	Schema.TaggedStruct("RestartCleared", { ...restartCleared.payload, at: Schema.Number, sequence: Schema.Number }),
]);
