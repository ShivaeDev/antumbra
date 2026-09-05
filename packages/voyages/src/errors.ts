import { Data } from "effect";

export class VoyageNotFound extends Data.TaggedError("VoyageNotFound")<{
	readonly voyageId: string;
}> {
	override get message(): string {
		return `voyage ${this.voyageId} is not in the fleet`;
	}
}
