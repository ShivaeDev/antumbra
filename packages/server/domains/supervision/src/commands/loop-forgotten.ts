import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { stoppedLoop } from "#rows/stopped-loop.ts";

export const loopForgotten = fact("LoopForgotten", { loop: Schema.String });

export const forgetLoop = command("forgetLoop", {
	input: { loop: Schema.String },
	reads: [],
	emits: loopForgotten,
	rejections: {},
	run: (input) => Effect.succeed({ loop: input.loop }),
});

export const loopForgottenMaterializer = materializer(loopForgotten, {
	writes: [stoppedLoop],
	run: Effect.fn("supervision.loopForgotten")(function* (fact, rows) {
		if (yield* rows.stoppedLoop.exists(fact.loop)) yield* rows.stoppedLoop.delete(fact.loop);
	}),
});
