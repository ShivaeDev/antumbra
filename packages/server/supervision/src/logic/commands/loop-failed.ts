import type * as Source from "@antumbra/domain-supervision/commands/loop-failed.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";

export const loopFailed = fact("LoopFailed", { loop: Schema.String, message: Schema.String, trace: Schema.String });

export const failLoop = (input: typeof Source.failLoop.Input.Type) =>
	Effect.succeed({ loop: input.loop, message: input.message, trace: input.trace });
