import { Data } from "effect";

// why: two crews on one piece is the one thing asking for it now must never
// do — the piece would read active while a second birth wrote a second claim
// against it, and neither hand would know about the other.
export class PieceAlreadyCrewed extends Data.TaggedError("PieceAlreadyCrewed")<{
	readonly agentId: string;
	readonly pieceId: string;
}> {
	override get message(): string {
		return `piece ${this.pieceId} already has ${this.agentId} at work on it`;
	}
}

// why: an abandoned piece is one the admiral has written off, and crewing it
// would leave the piece saying two things at once. Landing a different verdict
// is the honest way back to work on it.
export class PieceAbandoned extends Data.TaggedError("PieceAbandoned")<{
	readonly pieceId: string;
}> {
	override get message(): string {
		return `piece ${this.pieceId} was abandoned; land a different verdict before crewing it again`;
	}
}

// why: crew is born into a voyage — its charter is composed from the voyage's
// north star and context, and its authority is written against the voyage. A
// piece belonging to none has nothing to be told and nothing to answer to.
export class PieceNotOnVoyage extends Data.TaggedError("PieceNotOnVoyage")<{
	readonly pieceId: string;
}> {
	override get message(): string {
		return `piece ${this.pieceId} belongs to no voyage, so no crew can be sent to it`;
	}
}
