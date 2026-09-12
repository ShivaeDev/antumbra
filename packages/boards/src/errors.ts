import type { BoardOwnerKind } from "@antumbra/platform-vocabulary/board.ts";
import { Data } from "effect";

export class BoardOwnerNotFound extends Data.TaggedError("BoardOwnerNotFound")<{
	readonly ownerId: string;
	readonly ownerKind: BoardOwnerKind;
}> {
	override get message(): string {
		return `no ${this.ownerKind} named ${this.ownerId} carries a board`;
	}
}

export class BoardSourceConflict extends Data.TaggedError("BoardSourceConflict")<{
	readonly boardId: string;
	readonly sourceRef: string;
}> {
	override get message(): string {
		return `${this.sourceRef} already names a different entry on ${this.boardId}`;
	}
}

export class StoredBoardEntryInvalid extends Data.TaggedError("StoredBoardEntryInvalid")<{
	readonly detail: string;
	readonly entryId: string;
}> {}
