import type { Effect } from "effect";
import type { acknowledgeNotice } from "#commands/acknowledge-notice.ts";
import type { addContext } from "#commands/add-context.ts";
import type { answer } from "#commands/answer.ts";
import type { gate } from "#commands/gate.ts";
import type { markDelivered } from "#commands/mark-delivered.ts";
import type { park } from "#commands/park.ts";
import type { passUp } from "#commands/pass-up.ts";
import type { proclaim } from "#commands/proclaim.ts";
import type { reclassify } from "#commands/reclassify.ts";
import type { request } from "#commands/request.ts";
import type { supersede } from "#commands/supersede.ts";
import type { withdraw } from "#commands/withdraw.ts";
export const unexpectedAcknowledgeNotice = (error: Effect.Error<ReturnType<typeof acknowledgeNotice>>) =>
	error._tag !== "Unknown" && error._tag !== "AlreadyDone";
export const unexpectedAddContext = (error: Effect.Error<ReturnType<typeof addContext>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "AlreadyDone";
export const unexpectedAnswer = (error: Effect.Error<ReturnType<typeof answer>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "BelowRung" &&
	error._tag !== "OutsideAuthority" &&
	error._tag !== "ChoiceUnknown" &&
	error._tag !== "AlreadyDone";
export const unexpectedGate = (error: Effect.Error<ReturnType<typeof gate>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "PieceMissing" &&
	error._tag !== "AlreadyDone";
export const unexpectedMarkDelivered = (error: Effect.Error<ReturnType<typeof markDelivered>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "AlreadyDone";
export const unexpectedPark = (error: Effect.Error<ReturnType<typeof park>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "AlreadyParked" &&
	error._tag !== "AlreadyDone";
export const unexpectedPassUp = (error: Effect.Error<ReturnType<typeof passUp>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "NotAtRung" &&
	error._tag !== "AlreadyDone";
export const unexpectedProclaim = (error: Effect.Error<ReturnType<typeof proclaim>>) =>
	error._tag !== "SubjectMissing" && error._tag !== "ChoiceUnknown" && error._tag !== "OutsideAuthority" && error._tag !== "AlreadyDone";
export const unexpectedReclassify = (error: Effect.Error<ReturnType<typeof reclassify>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "Empty" &&
	error._tag !== "AlreadyDone";
export const unexpectedRequest = (error: Effect.Error<ReturnType<typeof request>>) =>
	error._tag !== "SubjectMissing" && error._tag !== "PieceMissing" && error._tag !== "RecommendationMissing" && error._tag !== "AlreadyDone";
export const unexpectedSupersede = (error: Effect.Error<ReturnType<typeof supersede>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "Self" &&
	error._tag !== "AlreadyDone";
export const unexpectedWithdraw = (error: Effect.Error<ReturnType<typeof withdraw>>) =>
	error._tag !== "Unknown" &&
	error._tag !== "AlreadyRuled" &&
	error._tag !== "NotRuled" &&
	error._tag !== "Retired" &&
	error._tag !== "Blank" &&
	error._tag !== "AlreadyDone";
