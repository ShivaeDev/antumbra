import { Data } from "effect";

export class PieceAlreadyCrewed extends Data.TaggedError("PieceAlreadyCrewed")<{
	readonly agentId: string;
	readonly pieceId: string;
}> {
	override get message(): string {
		return `piece ${this.pieceId} already has ${this.agentId} at work on it`;
	}
}

export class PieceAbandoned extends Data.TaggedError("PieceAbandoned")<{
	readonly pieceId: string;
}> {
	override get message(): string {
		return `piece ${this.pieceId} was abandoned; land a different verdict before crewing it again`;
	}
}

export class PieceNotOnVoyage extends Data.TaggedError("PieceNotOnVoyage")<{
	readonly pieceId: string;
}> {
	override get message(): string {
		return `piece ${this.pieceId} belongs to no voyage, so no crew can be sent to it`;
	}
}
