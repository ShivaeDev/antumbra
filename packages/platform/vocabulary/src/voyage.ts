import { Data, Option, Result, Schema } from "effect";

export const VoyageKindSchema = Schema.Literals(["voyage", "flagship"]);
export type VoyageKind = typeof VoyageKindSchema.Type;

export class StoredVoyageKindInvalid extends Data.TaggedError("StoredVoyageKindInvalid")<{
	readonly value: unknown;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `stored Voyage ${this.voyageId} has invalid kind: ${String(this.value)}`;
	}
}

const decodeKind = Schema.decodeUnknownOption(VoyageKindSchema);

export const decodeStoredVoyageKind = (voyageId: string, value: unknown): Result.Result<VoyageKind, StoredVoyageKindInvalid> => {
	const decoded = decodeKind(value);
	return Option.isSome(decoded) ? Result.succeed(decoded.value) : Result.fail(new StoredVoyageKindInvalid({ value, voyageId }));
};
