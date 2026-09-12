import type { VoyageNotFound } from "@antumbra/voyages/errors";
import { Data } from "effect";

export class PieceNotFound extends Data.TaggedError("PieceNotFound")<{
	readonly pieceId: string;
}> {}

export class EdgeWouldCycle extends Data.TaggedError("EdgeWouldCycle")<{
	readonly fromPieceId: string;
	readonly toPieceId: string;
}> {}

export class PieceIncomplete extends Data.TaggedError("PieceIncomplete")<{
	readonly field: string;
	readonly message: string;
}> {}

export type EdgeFailure = EdgeWouldCycle | PieceNotFound;

export type CharterFailure = EdgeFailure | PieceIncomplete | VoyageNotFound;
