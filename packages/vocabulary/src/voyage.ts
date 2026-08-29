import { Data, Option, Result, Schema } from "effect";

// why: the fleet keeps one voyage apart from the rest — the one whose north
// star is the fleet itself. Which voyage that is has to survive a restart, so
// it is a stored word rather than a name or a position, and the set is closed
// because a third kind would be a third answer to "who speaks for the fleet".
export const VOYAGE_KINDS = ["voyage", "flagship"] as const;

export const VoyageKindSchema = Schema.Literals(VOYAGE_KINDS);
export type VoyageKind = typeof VoyageKindSchema.Type;

export class StoredVoyageKindInvalid extends Data.TaggedError(
	"StoredVoyageKindInvalid",
)<{
	readonly value: unknown;
	readonly voyageId: string;
}> {
	override get message(): string {
		return `stored Voyage ${this.voyageId} has invalid kind: ${String(this.value)}`;
	}
}

const decodeKind = Schema.decodeUnknownOption(VoyageKindSchema);

export const decodeStoredVoyageKind = (
	voyageId: string,
	value: unknown,
): Result.Result<VoyageKind, StoredVoyageKindInvalid> => {
	const decoded = decodeKind(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new StoredVoyageKindInvalid({ value, voyageId }));
};
