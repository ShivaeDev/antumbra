import { BoardEntryIncomplete, BoardOwnerNotFound, type BoardScope, type BoardWriteFailure } from "@antumbra/boards";
import { Effect } from "effect";

export interface BoardRefused {
	readonly _tag: string;
	readonly field?: string;
	readonly message?: string;
}

const NAMELESS = "";

const ownerOf = (scope: BoardScope): BoardOwnerNotFound => {
	if (scope._tag === "Agent") {
		return new BoardOwnerNotFound({ ownerId: scope.agentId, ownerKind: "agent" });
	}
	return scope._tag === "Piece"
		? new BoardOwnerNotFound({ ownerId: scope.pieceId, ownerKind: "piece" })
		: new BoardOwnerNotFound({ ownerId: scope.voyageId, ownerKind: "voyage" });
};

export const writeRefused =
	(scope: BoardScope) =>
	(failure: BoardRefused): Effect.Effect<never, BoardWriteFailure> => {
		if (failure._tag === "UnknownBoard") {
			return Effect.fail(ownerOf(scope));
		}
		return failure._tag === "Blank"
			? Effect.fail(new BoardEntryIncomplete({ field: failure.field ?? NAMELESS, message: failure.message ?? NAMELESS }))
			: Effect.die(failure);
	};
