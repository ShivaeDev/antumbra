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

export class BoardEntryIncomplete extends Data.TaggedError("BoardEntryIncomplete")<{
	readonly field: string;
	readonly message: string;
}> {}

export type BoardWriteFailure = BoardEntryIncomplete | BoardOwnerNotFound;
