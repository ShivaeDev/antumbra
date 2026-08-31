import type { PrismaError } from "@antumbra/persistence";
import { Data } from "effect";

export class PieceNotFound extends Data.TaggedError("PieceNotFound")<{
	readonly pieceId: string;
}> {}

export class EdgeWouldCycle extends Data.TaggedError("EdgeWouldCycle")<{
	readonly fromPieceId: string;
	readonly toPieceId: string;
}> {}

export class VoyageNotFound extends Data.TaggedError("VoyageNotFound")<{
	readonly voyageId: string;
}> {
	override get message(): string {
		return `voyage ${this.voyageId} is not in the fleet`;
	}
}

export class StoredPieceVerdictInvalid extends Data.TaggedError("StoredPieceVerdictInvalid")<{
	readonly detail: string;
	readonly pieceId: string;
}> {
	override get message(): string {
		return `stored verdict on Piece ${this.pieceId} is invalid: ${this.detail}`;
	}
}

type EdgeFailure = EdgeWouldCycle | PieceNotFound | PrismaError;
export type CharterFailure = EdgeFailure | VoyageNotFound;
