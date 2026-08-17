import { Data } from "effect";

export class ChangeIdentityCollision extends Data.TaggedError(
	"ChangeIdentityCollision",
)<{
	readonly externalChangeId: string;
	readonly externalId: string;
	readonly host: string;
	readonly preparedChangeIds: ReadonlyArray<string>;
}> {
	override get message(): string {
		return `${this.host} observation ${this.externalId} names external change ${this.externalChangeId} and prepared change ${this.preparedChangeIds.join(", ")}`;
	}
}

export class ChangeObservationConflict extends Data.TaggedError(
	"ChangeObservationConflict",
)<{
	readonly changeId: string;
	readonly externalId: string;
	readonly host: string;
}> {
	override get message(): string {
		return `${this.host} observation ${this.externalId} did not attach to prepared change ${this.changeId}`;
	}
}

export class PreparedChangeInvalid extends Data.TaggedError(
	"PreparedChangeInvalid",
)<{
	readonly changeId: string;
	readonly detail: string;
}> {
	override get message(): string {
		return `prepared change ${this.changeId} is invalid: ${this.detail}`;
	}
}
