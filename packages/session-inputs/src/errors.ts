import { Data } from "effect";

export type SessionInputInvalidReason =
	| "corrupt_image"
	| "empty_input"
	| "empty_text"
	| "image_too_large"
	| "input_too_large"
	| "invalid_order"
	| "too_many_images"
	| "unsupported_media";

export class SessionInputInvalid extends Data.TaggedError(
	"SessionInputInvalid",
)<{
	readonly detail: string;
	readonly reason: SessionInputInvalidReason;
}> {
	override get message(): string {
		return `${this.reason}: ${this.detail}`;
	}
}

export class SessionInputConflict extends Data.TaggedError(
	"SessionInputConflict",
)<{
	readonly inputId: string;
}> {
	override get message(): string {
		return `conflict: input ${this.inputId} was already used for different content`;
	}
}

export class SessionInputNotFound extends Data.TaggedError(
	"SessionInputNotFound",
)<{
	readonly inputId: string;
}> {
	override get message(): string {
		return `input_not_found: no session input ${this.inputId} exists`;
	}
}

export class SessionInputCustodyFailed extends Data.TaggedError(
	"SessionInputCustodyFailed",
)<{
	readonly detail: string;
}> {
	override get message(): string {
		return `image_unavailable: ${this.detail}`;
	}
}

export class StoredSessionInputInvalid extends Data.TaggedError(
	"StoredSessionInputInvalid",
)<{
	readonly detail: string;
	readonly inputId: string;
}> {
	override get message(): string {
		return `stored_input_invalid: input ${this.inputId}: ${this.detail}`;
	}
}

export type SessionInputFailure =
	| SessionInputConflict
	| SessionInputCustodyFailed
	| SessionInputInvalid
	| SessionInputNotFound
	| StoredSessionInputInvalid;
