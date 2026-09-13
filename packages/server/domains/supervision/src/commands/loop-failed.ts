import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { stoppedLoop } from "#rows/stopped-loop.ts";

export const loopFailed = fact("LoopFailed", { loop: Schema.String, message: Schema.String, trace: Schema.String });

export const failLoop = command("failLoop", {
	input: { loop: Schema.String, message: Schema.String, trace: Schema.String },
	reads: [],
	emits: loopFailed,
	rejections: {},
	run: (input) => Effect.succeed({ loop: input.loop, message: input.message, trace: input.trace }),
});

export const loopFailedMaterializer = materializer(loopFailed, {
	writes: [stoppedLoop],
	run: Effect.fn("supervision.loopFailed")(function* (fact, rows) {
		const stopped = { at: fact.at, loop: fact.loop, message: fact.message, state: "stopped", trace: fact.trace } as const;
		if (yield* rows.stoppedLoop.exists(fact.loop)) yield* rows.stoppedLoop.update(fact.loop, stopped);
		else yield* rows.stoppedLoop.insert(stopped);
	}),
});
