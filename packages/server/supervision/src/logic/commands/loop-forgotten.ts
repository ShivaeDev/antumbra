import type * as Source from "@antumbra/domain-supervision/commands/loop-forgotten.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";

export const loopForgotten = fact("LoopForgotten", { loop: Schema.String });

export const forgetLoop = (input: typeof Source.forgetLoop.Input.Type) => Effect.succeed({ loop: input.loop });
