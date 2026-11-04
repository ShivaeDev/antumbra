import type { Effect } from "effect";
import type { failLoop } from "#commands/fail-loop.ts";
import type { forgetLoop } from "#commands/forget-loop.ts";
import type { resumeLoop } from "#commands/resume-loop.ts";
export const unexpectedFailLoop = (error: Effect.Error<ReturnType<typeof failLoop>>) => error._tag !== "AlreadyDone";
export const unexpectedForgetLoop = (error: Effect.Error<ReturnType<typeof forgetLoop>>) => error._tag !== "AlreadyDone";
export const unexpectedResumeLoop = (error: Effect.Error<ReturnType<typeof resumeLoop>>) => error._tag !== "AlreadyDone";
