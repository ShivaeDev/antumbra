import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { BoardOwnerNotFound } from "#errors.ts";
import type { BoardOwner, BoardScope } from "#model.ts";

export const ownerOf = (scope: BoardScope): BoardOwner => {
	if (scope.kind === "agent") {
		return { ownerId: scope.agentId, ownerKind: "agent" };
	}
	if (scope.kind === "piece") {
		return { ownerId: scope.pieceId, ownerKind: "piece" };
	}
	return { ownerId: scope.voyageId, ownerKind: "voyage" };
};

export const requireBoardOwner = (scope: BoardScope) =>
	Effect.gen(function* () {
		const db = yield* Database;
		let exists: boolean;
		if (scope.kind === "agent") {
			exists = yield* db.Agent.where({ id: scope.agentId }).exists();
		} else if (scope.kind === "piece") {
			exists = yield* db.Piece.where({ id: scope.pieceId }).exists();
		} else {
			exists = yield* db.Voyage.where({ id: scope.voyageId }).exists();
		}
		if (!exists) {
			return yield* new BoardOwnerNotFound(ownerOf(scope));
		}
	});

export const linkedBoardId = (scope: BoardScope) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.BoardOwner.where(ownerOf(scope))
			.first()
			.pipe(Effect.map((link) => Option.map(link, (row) => row.boardId)));
	});

export const linkBoard = (scope: BoardScope, boardId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.BoardOwner.create({ boardId, ...ownerOf(scope) });
	});
