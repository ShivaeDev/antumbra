import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Effect, Schema } from "effect";

const note = row("note", { id: Schema.String, board: Schema.String, text: Schema.String }, { key: "id", scope: "board" });

const noteWritten = fact("NoteWritten", { noteId: Schema.String, text: Schema.String });

const write = command("write", {
	input: { noteId: Schema.String, text: Schema.String },
	reads: [note],
	emits: noteWritten,
	rejections: { NoteIsEmpty: { noteId: Schema.String } },
	run: Effect.fn("notes.write")(function* (input, _rows, reject) {
		if (input.text === "") return yield* reject.NoteIsEmpty({ noteId: input.noteId });
		return { noteId: input.noteId, text: input.text };
	}),
});

const written = materializer(noteWritten, {
	writes: [note],
	run: Effect.fn("notes.NoteWritten")(function* (given, rows) {
		yield* rows.note.update(given.noteId, { text: given.text });
	}),
});

const onBoard = query("onBoard", {
	input: { board: Schema.String },
	output: Schema.Array(note.Row),
	reads: [note],
	scope: (input) => input.board,
	run: Effect.fn("notes.onBoard")(function* (input, rows) {
		return yield* rows.note.where({ board: input.board });
	}),
});

export const notes = feature("notes", { rows: [note], facts: [noteWritten], commands: [write], materializers: [written], queries: [onBoard] });

const board = row("board", { id: Schema.String, title: Schema.String }, { key: "id" });

const all = query("all", {
	input: {},
	output: Schema.Array(board.Row),
	reads: [board],
	run: Effect.fn("boards.all")(function* (_input, rows) {
		return yield* rows.board.where({});
	}),
});

export const boards = feature("boards", { rows: [board], facts: [], commands: [], materializers: [], queries: [all] });
