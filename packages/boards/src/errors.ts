import type { BoardOwnerKind } from "@antumbra/vocabulary/board";
import { Data } from "effect";

// why: a board hangs off one entity, so a missing owner is a mistake to
// answer rather than a board to mint — an orphan board cannot be shown.
export class BoardOwnerNotFound extends Data.TaggedError("BoardOwnerNotFound")<{
	readonly ownerId: string;
	readonly ownerKind: BoardOwnerKind;
}> {
	override get message(): string {
		return `no ${this.ownerKind} named ${this.ownerId} carries a board`;
	}
}

export class BoardSourceConflict extends Data.TaggedError(
	"BoardSourceConflict",
)<{
	readonly boardId: string;
	readonly sourceRef: string;
}> {
	override get message(): string {
		return `${this.sourceRef} already names different mail on ${this.boardId}`;
	}
}

export class MailNotAddressed extends Data.TaggedError("MailNotAddressed")<{
	readonly agentId: string;
	readonly entryId: string;
}> {
	override get message(): string {
		return `${this.entryId} is not mail addressed to ${this.agentId}`;
	}
}

export class StoredBoardEntryInvalid extends Data.TaggedError(
	"StoredBoardEntryInvalid",
)<{
	readonly detail: string;
	readonly entryId: string;
}> {}
