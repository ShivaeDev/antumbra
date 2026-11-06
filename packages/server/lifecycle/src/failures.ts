import type { Effect } from "effect";
import type { clear } from "#clear.ts";
import type { record } from "#record.ts";
export const unexpectedRecord = (error: Effect.Error<ReturnType<typeof record>>) => error._tag !== "AlreadyDone";
export const unexpectedClear = (error: Effect.Error<ReturnType<typeof clear>>) => error._tag !== "AlreadyDone";
