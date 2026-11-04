import type { Effect } from "effect";
import type { admit } from "#commands/admit.ts";
import type { cancel } from "#commands/cancel.ts";
import type { delay } from "#commands/delay.ts";
import type { hail } from "#commands/hail.ts";
import type { hold } from "#commands/hold.ts";
import type { request } from "#commands/request.ts";
import type { retire } from "#commands/retire.ts";
import type { retireCrew } from "#commands/retire-crew.ts";
import type { retry } from "#commands/retry.ts";
import type { smooth } from "#commands/smooth.ts";
import type { spawn } from "#commands/spawn.ts";
import type { workNow } from "#commands/work-now.ts";
export const unexpectedRetireCrew = (error: Effect.Error<ReturnType<typeof retireCrew>>) => error._tag !== "Working" && error._tag !== "AlreadyDone";
export const unexpectedRetire = (error: Effect.Error<ReturnType<typeof retire>>) =>
	error._tag !== "Unknown" && error._tag !== "Working" && error._tag !== "AlreadyDone";
export const unexpectedSpawn = (error: Effect.Error<ReturnType<typeof spawn>>) => error._tag !== "AgentExists" && error._tag !== "AlreadyDone";
export const unexpectedHail = (error: Effect.Error<ReturnType<typeof hail>>) =>
	error._tag !== "UnknownVoyage" &&
	error._tag !== "CaptainAlreadyHailed" &&
	error._tag !== "CaptainSessionUnavailable" &&
	error._tag !== "CaptainStopped" &&
	error._tag !== "VoyageQuiet" &&
	error._tag !== "AgentExists" &&
	error._tag !== "AlreadyDone";
export const unexpectedWorkNow = (error: Effect.Error<ReturnType<typeof workNow>>) =>
	error._tag !== "PieceAbandoned" &&
	error._tag !== "PieceAlreadyCrewed" &&
	error._tag !== "AgentExists" &&
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyDone";
export const unexpectedRequest = (error: Effect.Error<ReturnType<typeof request>>) =>
	error._tag !== "PieceAbandoned" &&
	error._tag !== "PieceAlreadyCrewed" &&
	error._tag !== "AgentExists" &&
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyDone";
export const unexpectedAdmit = (error: Effect.Error<ReturnType<typeof admit>>) =>
	error._tag !== "NotEligible" &&
	error._tag !== "Unknown" &&
	error._tag !== "NotRequested" &&
	error._tag !== "Held" &&
	error._tag !== "NoSlot" &&
	error._tag !== "NotOldest" &&
	error._tag !== "AlreadyDone";
export const unexpectedHold = (error: Effect.Error<ReturnType<typeof hold>>) => error._tag !== "Unavailable" && error._tag !== "AlreadyDone";
export const unexpectedDelay = (error: Effect.Error<ReturnType<typeof delay>>) => error._tag !== "Unavailable" && error._tag !== "AlreadyDone";
export const unexpectedCancel = (error: Effect.Error<ReturnType<typeof cancel>>) =>
	error._tag !== "Unknown" && error._tag !== "NotAllowed" && error._tag !== "AlreadyDone";
export const unexpectedRetry = (error: Effect.Error<ReturnType<typeof retry>>) =>
	error._tag !== "Unknown" && error._tag !== "NotAllowed" && error._tag !== "AlreadyDone";
export const unexpectedSmooth = (error: Effect.Error<ReturnType<typeof smooth>>) =>
	error._tag !== "UnknownVoyage" &&
	error._tag !== "WrongAgent" &&
	error._tag !== "Busy" &&
	error._tag !== "SessionExists" &&
	error._tag !== "AlreadyDone";
