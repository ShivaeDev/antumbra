import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { BoardId } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Schema } from "effect";
import { owned } from "#commands/board.ts";
import { noteWritten } from "#facts/note-written.ts";

export const write = command("write", {
	input: {
		board: BoardId,
		register: titled(Schema.Literals(["smooth", "rough"]), { title: "Register" }),
		body: titled(Schema.String, { multiline: true, title: "Entry" }),
		author: Schema.NullOr(Schema.String),
	},
	reads: owned,
	emits: noteWritten,
	rejections: {
		Blank: { field: Schema.String, message: Schema.String },
		UnknownBoard: { board: Schema.String },
	},
});
