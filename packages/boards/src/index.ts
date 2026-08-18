export type { BoardRegister } from "@antumbra/vocabulary/board";
export { StoredBoardOwnerKindInvalid } from "@antumbra/vocabulary/board";
export {
	type BoardReadFailure,
	Boards,
	BoardsLive,
	type BoardsService,
	type BoardWriteFailure,
	type MarkReadFailure,
} from "#boards.ts";
export { smoothBodies } from "#entries.ts";
export {
	BoardOwnerNotFound,
	BoardSourceConflict,
	MailNotAddressed,
	StoredBoardEntryInvalid,
} from "#errors.ts";
export type {
	BoardEntryRow,
	MailInput,
	MailPrecedence,
} from "#model.ts";
export { BoardScope, EntryInput } from "#model.ts";
