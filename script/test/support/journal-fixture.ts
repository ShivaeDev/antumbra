import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { app } from "@antumbra/server-journal/app.ts";
import { Effect, Schema } from "effect";

const note = row("note", { id: Schema.String, text: Schema.String }, { key: "id" });
const beacon = row("beacon", { id: Schema.String }, { key: "id" });

const noteWritten = fact("NoteWritten", { id: Schema.String, text: Schema.String });
const noteCleared = fact("NoteCleared", { id: Schema.String });
const beaconLit = fact("BeaconLit", { id: Schema.String });

const ledger = feature("ledger", {
	rows: [note],
	facts: [noteWritten, noteCleared],
	commands: [
		command("write", {
			input: { id: Schema.String, text: Schema.String },
			reads: [],
			emits: noteWritten,
			rejections: {},
			run: (input) => Effect.succeed({ id: input.id, text: input.text }),
		}),
		command("clear", {
			input: { id: Schema.String },
			reads: [],
			emits: noteCleared,
			rejections: {},
			run: (input) => Effect.succeed({ id: input.id }),
		}),
	],
	materializers: [
		materializer(noteWritten, {
			writes: [note],
			run: Effect.fn("ledger.NoteWritten")(function* (written, rows) {
				yield* rows.note.insert({ id: written.id, text: written.text });
			}),
		}),
		materializer(noteCleared, {
			writes: [note],
			run: Effect.fn("ledger.NoteCleared")(function* (cleared, rows) {
				yield* rows.note.delete(cleared.id);
			}),
		}),
	],
	queries: [],
});

const beacons = feature("beacons", {
	rows: [beacon],
	facts: [beaconLit],
	commands: [
		command("light", {
			input: { id: Schema.String },
			reads: [],
			emits: beaconLit,
			rejections: {},
			run: (input) => Effect.succeed({ id: input.id }),
		}),
	],
	materializers: [
		materializer(beaconLit, {
			writes: [beacon],
			run: Effect.fn("beacons.BeaconLit")(function* (lit, rows) {
				yield* rows.beacon.insert({ id: lit.id });
			}),
		}),
	],
	queries: [],
});

export const definition = app([ledger, beacons]);
