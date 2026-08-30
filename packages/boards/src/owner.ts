import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { BoardOwnerNotFound } from "#errors.ts";
import { type BoardOwner, BoardScope } from "#model.ts";

const ownerOf = (scope: BoardScope): BoardOwner =>
	BoardScope.$match(scope, {
		Agent: ({ agentId }): BoardOwner => ({
			ownerId: agentId,
			ownerKind: "agent",
		}),
		Piece: ({ pieceId }): BoardOwner => ({
			ownerId: pieceId,
			ownerKind: "piece",
		}),
		Voyage: ({ voyageId }): BoardOwner => ({
			ownerId: voyageId,
			ownerKind: "voyage",
		}),
	});

export const requireBoardOwner = (scope: BoardScope) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const exists = yield* BoardScope.$match(scope, {
			Agent: ({ agentId }) => db.Agent.where({ id: agentId }).exists(),
			Piece: ({ pieceId }) => db.Piece.where({ id: pieceId }).exists(),
			Voyage: ({ voyageId }) => db.Voyage.where({ id: voyageId }).exists(),
		});
		if (!exists) {
			return yield* new BoardOwnerNotFound(ownerOf(scope));
		}
	});

export const linkedBoardId = (scope: BoardScope) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.BoardOwner.where(ownerOf(scope))
			.select("boardId")
			.first()
			.pipe(Effect.map((link) => Option.map(link, (row) => row.boardId)));
	});

export const linkBoard = (scope: BoardScope, boardId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.BoardOwner.create({ boardId, ...ownerOf(scope) });
	});
