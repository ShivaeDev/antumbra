export type { BoardRegister } from "@antumbra/vocabulary/board";
export { Boards, BoardsLive, type BoardsService } from "#boards.ts";
export { smoothBodies } from "#entries.ts";
export {
	BoardOwnerNotFound,
	BoardSourceConflict,
	MailNotAddressed,
	StoredBoardEntryInvalid,
} from "#errors.ts";
export type { BoardEntryRow } from "#model.ts";
export { BoardScope, EntryInput } from "#model.ts";
