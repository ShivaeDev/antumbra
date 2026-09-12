import { fact } from "@antumbra/platform-feature/fact.ts";
import { BoardRegisterSchema } from "@antumbra/platform-vocabulary/board.ts";
import { Schema } from "effect";
import { BoardEntryId, BoardId } from "#ids.ts";
import { Sequence } from "#rows/board-entry.ts";

export const noteWritten = fact("NoteWritten", {
	id: BoardEntryId,
	board: BoardId,
	number: Sequence,
	register: BoardRegisterSchema,
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
});
