import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";

const note = row("note", { id: Schema.String, board: Schema.String, text: Schema.String }, { key: "id", scope: "board" });

const noteWritten = fact("NoteWritten", { noteId: Schema.String, text: Schema.String });

const write = command("write", {
	input: { noteId: Schema.String, text: Schema.String },
	reads: [note],
	emits: noteWritten,
	rejections: { NoteIsEmpty: { noteId: Schema.String } },
});

const onBoard = query("onBoard", {
	input: { board: Schema.String },
	output: Schema.Array(note.Row),
	reads: [note],
	scope: (input) => input.board,
});

export const notes = feature("notes", { rows: [note], facts: [noteWritten], commands: [write], queries: [onBoard] });

const board = row("board", { id: Schema.String, title: Schema.String }, { key: "id" });

const all = query("all", {
	input: {},
	output: Schema.Array(board.Row),
	reads: [board],
});

export const boards = feature("boards", { rows: [board], facts: [], commands: [], queries: [all] });
