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
}> {}

export type EdgeFailure = EdgeWouldCycle | PieceNotFound | PrismaError;
export type CharterFailure = EdgeFailure | VoyageNotFound;
