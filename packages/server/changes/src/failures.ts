import type { Effect } from "effect";
import type { Changes } from "#service.ts";
export const unexpectedFailAdoption = (error: Effect.Error<ReturnType<typeof Changes.Service.failAdoption>>) => error._tag !== "AlreadyDone";
export const unexpectedRetryAdoption = (error: Effect.Error<ReturnType<typeof Changes.Service.retryAdoption>>) =>
	error._tag !== "UnknownRequest" && error._tag !== "AlreadyDone";
export const unexpectedObserveHostCapability = (error: Effect.Error<ReturnType<typeof Changes.Service.observeHostCapability>>) =>
	error._tag !== "AlreadyDone";
export const unexpectedFailPublication = (error: Effect.Error<ReturnType<typeof Changes.Service.failPublication>>) => error._tag !== "AlreadyDone";
export const unexpectedRefresh = (error: Effect.Error<ReturnType<typeof Changes.Service.refresh>>) => error._tag !== "AlreadyDone";
export const unexpectedRequestAdoption = (error: Effect.Error<ReturnType<typeof Changes.Service.requestAdoption>>) =>
	error._tag !== "UnknownPiece" && error._tag !== "UnknownRepo" && error._tag !== "AlreadyDone";
export const unexpectedPrepare = (error: Effect.Error<ReturnType<typeof Changes.Service.prepare>>) =>
	error._tag !== "ResourceOwnerUnavailable" &&
	error._tag !== "UnknownPiece" &&
	error._tag !== "UnknownRepo" &&
	error._tag !== "ResourceClaimed" &&
	error._tag !== "AlreadyDone";
export const unexpectedFreeze = (error: Effect.Error<ReturnType<typeof Changes.Service.freeze>>) =>
	error._tag !== "ResourceOwnerUnavailable" && error._tag !== "UnknownChange" && error._tag !== "ResourceClaimed" && error._tag !== "AlreadyDone";
export const unexpectedObserve = (error: Effect.Error<ReturnType<typeof Changes.Service.observe>>) =>
	error._tag !== "ChangeIdentityCollision" &&
	error._tag !== "ChangeObservationConflict" &&
	error._tag !== "ResourceClaimed" &&
	error._tag !== "AlreadyDone";
export const unexpectedAdopt = (error: Effect.Error<ReturnType<typeof Changes.Service.adopt>>) =>
	error._tag !== "ResourceOwnerUnavailable" &&
	error._tag !== "UnknownPiece" &&
	error._tag !== "UnknownRepo" &&
	error._tag !== "ChangeIdentityCollision" &&
	error._tag !== "ChangeObservationConflict" &&
	error._tag !== "ResourceClaimed" &&
	error._tag !== "AlreadyDone";
export const unexpectedArchive = (error: Effect.Error<ReturnType<typeof Changes.Service.archive>>) =>
	error._tag !== "UnknownChange" && error._tag !== "ChangeStillOpen" && error._tag !== "AlreadyDone";
export const unexpectedDismiss = (error: Effect.Error<ReturnType<typeof Changes.Service.dismiss>>) =>
	error._tag !== "UnknownChange" && error._tag !== "ChangeStillAlive" && error._tag !== "AlreadyDone";
export const unexpectedForwardFeedback = (error: Effect.Error<ReturnType<typeof Changes.Service.forwardFeedback>>) => error._tag !== "AlreadyDone";
