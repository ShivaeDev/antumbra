import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import { Effect, Option } from "effect";

// why: a board hangs off exactly one entity and each link is its own typed
// table — a polymorphic scope column would let a board point at nothing and
// turn every read into a string comparison.
export type BoardScope =
	| { readonly agentId: string; readonly kind: "agent" }
	| { readonly kind: "piece"; readonly pieceId: string }
	| { readonly kind: "voyage"; readonly voyageId: string };

const boardIdOf = (link: Option.Option<{ readonly boardId: string }>) =>
	Option.map(link, (row) => row.boardId);

export const linkedBoardId = (
	db: DatabaseService,
	scope: BoardScope,
): Effect.Effect<Option.Option<string>, PrismaError, WriteExecutors> => {
	if (scope.kind === "agent") {
		return db.AgentBoard.where({ agentId: scope.agentId })
			.first()
			.pipe(Effect.map(boardIdOf));
	}
	if (scope.kind === "piece") {
		return db.PieceBoard.where({ pieceId: scope.pieceId })
			.first()
			.pipe(Effect.map(boardIdOf));
	}
	return db.VoyageBoard.where({ voyageId: scope.voyageId })
		.first()
		.pipe(Effect.map(boardIdOf));
};

export const linkBoard = (
	db: DatabaseService,
	scope: BoardScope,
	boardId: string,
): Effect.Effect<void, PrismaError, WriteExecutors> => {
	if (scope.kind === "agent") {
		return db.AgentBoard.create({ agentId: scope.agentId, boardId }).pipe(
			Effect.asVoid,
		);
	}
	if (scope.kind === "piece") {
		return db.PieceBoard.create({ boardId, pieceId: scope.pieceId }).pipe(
			Effect.asVoid,
		);
	}
	return db.VoyageBoard.create({ boardId, voyageId: scope.voyageId }).pipe(
		Effect.asVoid,
	);
};
