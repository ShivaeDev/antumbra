import type { Effect } from "effect";
import type { Inputs } from "#service.ts";
export const unexpectedSubmit = (error: Effect.Error<ReturnType<typeof Inputs.Service.submit>>) =>
	error._tag !== "InvalidInput" &&
	error._tag !== "InputConflict" &&
	error._tag !== "InputNotFound" &&
	error._tag !== "ImageUnavailable" &&
	error._tag !== "InputAmbiguous" &&
	error._tag !== "InputRefused";
export const unexpectedRecord = (error: Effect.Error<ReturnType<typeof Inputs.Service.record>>) =>
	error._tag !== "InputRefused" && error._tag !== "InputConflict" && error._tag !== "InvalidInput" && error._tag !== "AlreadyDone";
export const unexpectedDelivery = (error: Effect.Error<ReturnType<typeof Inputs.Service.delivery>>) =>
	error._tag !== "InputNotFound" && error._tag !== "DeliverySettled" && error._tag !== "AlreadyDone";
export const unexpectedRetry = (error: Effect.Error<ReturnType<typeof Inputs.Service.retry>>) =>
	error._tag !== "DeliverySettled" && error._tag !== "InputRefused" && error._tag !== "AlreadyDone";
