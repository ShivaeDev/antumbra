import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";

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

describe("row", () => {
	it("keeps the key and the scope beside the schema", () => {
		expect(note.key).toBe("id");
		expect(note.scope).toBe("board");
		expect(Object.keys(note.fields)).toEqual(["id", "board", "text"]);
	});
});

describe("fact", () => {
	it("stamps the payload with the sequence number, the time and the request", () => {
		expect(Object.keys(noteWritten.Fact.fields).toSorted()).toEqual(["at", "noteId", "requestId", "seq", "text"]);
		expect(Object.keys(noteWritten.Payload.fields).toSorted()).toEqual(["noteId", "text"]);
	});

	it("refuses a payload field the journal stamps", () => {
		expect(() => fact("NoteWritten", { noteId: Schema.String, seq: Schema.Number })).toThrow(
			'the fact "NoteWritten" declares the field "seq", which the journal stamps on every fact',
		);
	});

	it("accepts a payload that names no stamped field", () => {
		const noteNumbered = fact("NoteNumbered", { noteId: Schema.String, number: Schema.Number });
		expect(Object.keys(noteNumbered.Payload.fields)).toEqual(["noteId", "number"]);
	});
});

describe("command", () => {
	it("puts the request id on the input the caller must supply", () => {
		expect(Object.keys(write.Input.fields).toSorted()).toEqual(["noteId", "requestId", "text"]);
	});

	it("refuses an input field every command takes from its caller", () => {
		const declare = () =>
			command("write", {
				input: { noteId: Schema.String, requestId: Schema.String },
				reads: [note],
				emits: noteWritten,
				rejections: {},
				run: Effect.fn("notes.write")(function* (input) {
					return yield* Effect.succeed({ noteId: input.noteId, text: "" });
				}),
			});
		expect(declare).toThrow('the command "write" declares the field "requestId", which every command takes from its caller');
	});

	it("accepts an input that names no reserved field", () => {
		expect(Object.keys(write.input)).toEqual(["noteId", "text"]);
	});

	it("carries AlreadyDone beside the rejections it declared", () => {
		expect(Object.keys(write.Rejection).toSorted()).toEqual(["AlreadyDone", "NoteIsEmpty"]);
	});

	it("rejects through the class it declared", () => {
		const rejection = Effect.runSync(Effect.flip(write.reject.NoteIsEmpty({ noteId: "n1" })));
		expect(rejection).toBeInstanceOf(write.Rejection.NoteIsEmpty);
		expect(rejection._tag).toBe("NoteIsEmpty");
	});
});

describe("feature", () => {
	it("collects the parts under one name", () => {
		const notes = feature("notes", {
			rows: [note],
			facts: [noteWritten],
			commands: [write],
			materializers: [written],
			queries: [onBoard],
		});
		expect(notes.name).toBe("notes");
		expect(notes.rows).toEqual([note]);
		expect(notes.materializers[0]?.fact.name).toBe("NoteWritten");
	});
});
