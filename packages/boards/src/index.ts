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
	BoardRegister,
	BoardScope,
	EntryInput,
	MailInput,
	MailPrecedence,
} from "#model.ts";
