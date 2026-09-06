import { BoardScope, Boards, type SmoothingSpan } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { readAgentExecution } from "#execution/agents.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { concludedPieces } from "#piece-state.ts";

export interface ConcludedPiece {
	readonly pieceId: string;
	readonly title: string;
	readonly voyageId: string;
}

export interface PieceToSmooth extends ConcludedPiece {
	readonly span: SmoothingSpan;
}

export const concludedPiecesOf = Effect.fnUntraced(function* (voyageIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const memberships = yield* db.VoyagePiece.where((membership) => membership.voyageId.in(voyageIds)).all();
	const pieces = yield* db.Piece.where((piece) => piece.id.in(memberships.map((membership) => membership.pieceId)))
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const pieceIds = pieces.map((piece) => piece.id);
	const assignments = yield* db.PieceAgent.where((assignment) => assignment.pieceId.in(pieceIds)).all();
	const agents = yield* db.Agent.where((agent) => agent.id.in(assignments.map((assignment) => assignment.agentId)))
		.orderBy((agent) => agent.createdAt.asc())
		.all();
	const concluded = concludedPieces({
		...(yield* readAgentExecution(agents)),
		...(yield* readOutcomes(pieceIds)),
		assignments,
		pieces,
	});
	const voyageOf = new Map(memberships.map((membership) => [membership.pieceId, membership.voyageId]));
	return pieces.flatMap((piece) => {
		const voyageId = voyageOf.get(piece.id);
		return concluded.has(piece.id) && voyageId !== undefined ? [{ pieceId: piece.id, title: piece.title, voyageId } satisfies ConcludedPiece] : [];
	});
});

export const makeSpannedPieces = Effect.gen(function* () {
	const boards = yield* Boards;
	return Effect.fnUntraced(function* (pieces: ReadonlyArray<ConcludedPiece>) {
		const spans = yield* Effect.forEach(pieces, (piece) =>
			boards
				.span(BoardScope.Piece({ pieceId: piece.pieceId }))
				.pipe(Effect.map(Option.match({ onNone: () => [], onSome: (span) => [{ ...piece, span } satisfies PieceToSmooth] }))),
		);
		return spans.flat();
	});
});
