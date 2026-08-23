import { Database } from "@antumbra/persistence";
import { Effect, Option, Result } from "effect";
import {
	SessionInputConflict,
	SessionInputNotFound,
	StoredSessionInputInvalid,
} from "#errors.ts";
import type { SessionInputDeliveryStatus } from "#model.ts";

export const deliveryStatus = (
	inputId: string,
	value: string,
): Result.Result<SessionInputDeliveryStatus, StoredSessionInputInvalid> => {
	switch (value) {
		case "accepted":
		case "ambiguous":
		case "pending":
		case "queued_for_wake":
		case "refused":
			return Result.succeed(value);
		default:
			return Result.fail(
				new StoredSessionInputInvalid({
					detail: `unknown delivery status ${value}`,
					inputId,
				}),
			);
	}
};

export const requireInput = (inputId: string) =>
	Database.pipe(
		Effect.flatMap((db) => db.SessionInput.where({ id: inputId }).first()),
		Effect.flatMap(
			Option.match({
				onNone: () => new SessionInputNotFound({ inputId }),
				onSome: Effect.succeed,
			}),
		),
	);

export const requireSameRequest = (
	inputId: string,
	requestDigest: string,
	storedDigest: string,
) =>
	requestDigest === storedDigest
		? Effect.void
		: Effect.fail(new SessionInputConflict({ inputId }));
