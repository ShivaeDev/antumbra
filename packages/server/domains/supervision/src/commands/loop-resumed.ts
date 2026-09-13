import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { stoppedLoop } from "#rows/stopped-loop.ts";

export const loopResumed = fact("LoopResumed", { loop: Schema.String });

export const resumeLoop = command("resumeLoop", {
	input: { loop: Schema.String },
	reads: [],
	emits: loopResumed,
	rejections: {},
	run: (input) => Effect.succeed({ loop: input.loop }),
});

export const loopResumedMaterializer = materializer(loopResumed, {
	writes: [stoppedLoop],
	run: Effect.fn("supervision.loopResumed")(function* (fact, rows) {
		if (yield* rows.stoppedLoop.exists(fact.loop)) yield* rows.stoppedLoop.update(fact.loop, { state: "resumed" });
	}),
});
