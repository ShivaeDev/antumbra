import type { Effect } from "effect";
import type { claim } from "#commands/claim.ts";
import type { failed } from "#commands/failed.ts";
import type { held } from "#commands/held.ts";
import type { plan } from "#commands/plan.ts";
import type { ready } from "#commands/ready.ts";
import type { reclaimed } from "#commands/reclaimed.ts";
export const unexpectedPlan = (error: Effect.Error<ReturnType<typeof plan>>) =>
	error._tag !== "OwnerUnavailable" && error._tag !== "Claimed" && error._tag !== "PlanConflict" && error._tag !== "AlreadyDone";
export const unexpectedReady = (error: Effect.Error<ReturnType<typeof ready>>) =>
	error._tag !== "OwnerUnavailable" && error._tag !== "Claimed" && error._tag !== "MissingPlan" && error._tag !== "AlreadyDone";
export const unexpectedClaim = (error: Effect.Error<ReturnType<typeof claim>>) =>
	error._tag !== "Ineligible" && error._tag !== "Held" && error._tag !== "NothingToReclaim" && error._tag !== "AlreadyDone";
export const unexpectedReclaimed = (error: Effect.Error<ReturnType<typeof reclaimed>>) => error._tag !== "StaleClaim" && error._tag !== "AlreadyDone";
export const unexpectedHeld = (error: Effect.Error<ReturnType<typeof held>>) => error._tag !== "StaleClaim" && error._tag !== "AlreadyDone";
export const unexpectedFailed = (error: Effect.Error<ReturnType<typeof failed>>) => error._tag !== "StaleClaim" && error._tag !== "AlreadyDone";
