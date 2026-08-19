import { Data, Option, Result, Schema } from "effect";

// why: Board storage, tools, and public views all speak these same words. This
// leaf prevents any one consumer from widening or restating the vocabulary.
export const BoardRegisterSchema = Schema.Literals(["rough", "smooth"]);
export type BoardRegister = typeof BoardRegisterSchema.Type;

const BoardOwnerKindSchema = Schema.Literals(["agent", "piece", "voyage"]);
export type BoardOwnerKind = typeof BoardOwnerKindSchema.Type;

export class StoredBoardOwnerKindInvalid extends Data.TaggedError(
	"StoredBoardOwnerKindInvalid",
)<{
	readonly ownerId: string;
	readonly value: unknown;
}> {
	override get message(): string {
		return `stored Board owner ${this.ownerId} has invalid kind: ${String(this.value)}`;
	}
}

export const decodeStoredBoardOwnerKind = (
	ownerId: string,
	value: unknown,
): Result.Result<BoardOwnerKind, StoredBoardOwnerKindInvalid> => {
	const decoded = Schema.decodeUnknownOption(BoardOwnerKindSchema)(value);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new StoredBoardOwnerKindInvalid({ ownerId, value }));
};
