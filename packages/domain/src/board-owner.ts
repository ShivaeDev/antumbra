import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { BoardScope } from "#board-scope.ts";
import { ownerOf } from "#board-scope.ts";
import { BoardOwnerNotFound } from "#errors.ts";

export const boardOwnerExists = (scope: BoardScope) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (scope.kind === "agent") {
			return yield* db.Agent.where({ id: scope.agentId }).exists();
		}
		if (scope.kind === "piece") {
			return yield* db.Piece.where({ id: scope.pieceId }).exists();
		}
		return yield* db.Voyage.where({ id: scope.voyageId }).exists();
	});

export const requireBoardOwner = (scope: BoardScope) =>
	Effect.gen(function* () {
		if (!(yield* boardOwnerExists(scope))) {
			return yield* new BoardOwnerNotFound(ownerOf(scope));
		}
	});
