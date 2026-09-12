import { BoardScope, Boards, type SmoothingSpan } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { readAgentExecution } from "#execution/agents.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { piecesOfVoyages } from "#piece-reading.ts";
import { concludedPieces } from "#piece-state.ts";

export interface ConcludedPiece {
	readonly pieceId: string;
	readonly title: string;
	readonly voyageId: string;
}

export interface PieceToSmooth extends ConcludedPiece {
	readonly span: SmoothingSpan;
}

export const concludedPiecesOf = Effect.fnUntraced(function* (voyageIds: ReadonlyArray<string>, excluded: ReadonlySet<string>) {
	const db = yield* Database;
	const pieces = (yield* piecesOfVoyages(voyageIds)).filter((piece) => !excluded.has(piece.id));
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
	const settled: ConcludedPiece[] = [];
	for (const piece of pieces) {
		if (concluded.has(piece.id)) {
			settled.push({ pieceId: piece.id, title: piece.title, voyageId: piece.voyageId });
		}
	}
	return settled;
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
