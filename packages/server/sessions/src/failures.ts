import type { Effect } from "effect";
import type { charter } from "#commands/charter.ts";
import type { request } from "#commands/request.ts";
import type { retry } from "#commands/retry.ts";
import type { stop } from "#commands/stop.ts";
export const unexpectedRequest = (error: Effect.Error<ReturnType<typeof request>>) =>
	error._tag !== "Unavailable" && error._tag !== "Busy" && error._tag !== "AlreadyDone";
export const unexpectedRetry = (error: Effect.Error<ReturnType<typeof retry>>) => error._tag !== "Unavailable" && error._tag !== "AlreadyDone";
export const unexpectedCharter = (error: Effect.Error<ReturnType<typeof charter>>) => error._tag !== "AlreadyDone";
export const unexpectedStop = (error: Effect.Error<ReturnType<typeof stop>>) =>
	error._tag !== "Unavailable" && error._tag !== "Busy" && error._tag !== "AlreadyDone";
