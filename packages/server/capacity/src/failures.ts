import type { Effect } from "effect";
import type { observe } from "#commands/observe.ts";
import type { release } from "#commands/release.ts";
export const unexpectedObserve = (error: Effect.Error<ReturnType<typeof observe>>) => error._tag !== "AlreadyDone";
export const unexpectedRelease = (error: Effect.Error<ReturnType<typeof release>>) => error._tag !== "UnknownBackend" && error._tag !== "AlreadyDone";
