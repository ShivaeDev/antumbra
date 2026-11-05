import type * as Source from "@antumbra/domain-supervision/commands/loop-resumed.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";

export const loopResumed = fact("LoopResumed", { loop: Schema.String });

export const resumeLoop = (input: typeof Source.resumeLoop.Input.Type) => Effect.succeed({ loop: input.loop });
