import { Data } from "effect";

export class IntentNotFound extends Data.TaggedError("IntentNotFound")<{
	readonly id: string;
}> {}

export class UnregisteredIntentTag extends Data.TaggedError("UnregisteredIntentTag")<{
	readonly tag: string;
}> {}

export class PayloadInvalid extends Data.TaggedError("PayloadInvalid")<{
	readonly detail: string;
}> {}

export class StoredIntentInvalid extends Data.TaggedError("StoredIntentInvalid")<{
	readonly detail: string;
	readonly id: string;
}> {}
