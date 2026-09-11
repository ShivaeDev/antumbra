import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import type { CommandsProof, FactsProof, MaterializersProof, QueriesProof } from "@antumbra/platform-feature/proof.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Effect, Schema } from "effect";

const note = row("note", { id: Schema.String, text: Schema.String }, { key: "id" });

const noteWritten = fact("NoteWritten", { noteId: Schema.String, text: Schema.String });

const write = command("write", {
	input: { noteId: Schema.String, text: Schema.String },
	reads: [note],
	emits: noteWritten,
	rejections: {},
	run: (input) => Effect.succeed({ noteId: input.noteId, text: input.text }),
});

const written = materializer(noteWritten, {
	writes: [note],
	run: (given, rows) => rows.note.update(given.noteId, { text: given.text }),
});

const everywhere = query("everywhere", {
	input: {},
	output: Schema.Array(note.Row),
	reads: [note],
	run: (_input, rows) => rows.note.where({}),
});

type Sentence<Proof extends readonly unknown[]> = keyof Proof[number];

export const factWithoutAMaterializer: Sentence<FactsProof<readonly [typeof noteWritten], readonly []>> =
	'the fact "NoteWritten" has no materializer in this feature';

export const factWithTwoMaterializers: Sentence<FactsProof<readonly [typeof noteWritten], readonly [typeof written, typeof written]>> =
	'the fact "NoteWritten" has more than one materializer in this feature';

export const materializerOfAnUndeclaredFact: Sentence<MaterializersProof<readonly [typeof written], readonly [], readonly [typeof note]>> =
	'the materializer for "NoteWritten" materializes a fact this feature does not declare';

export const materializerWritingAnUndeclaredRow: Sentence<MaterializersProof<readonly [typeof written], readonly [typeof noteWritten], readonly []>> =
	'the materializer for "NoteWritten" writes the row "note", which this feature does not declare';

export const commandEmittingAnUndeclaredFact: Sentence<CommandsProof<readonly [typeof write], readonly [], readonly [typeof note]>> =
	'the command "write" emits the fact "NoteWritten", which this feature does not declare';

export const commandReadingAnUndeclaredRow: Sentence<CommandsProof<readonly [typeof write], readonly [typeof noteWritten], readonly []>> =
	'the command "write" reads the row "note", which this feature does not declare';

export const queryReadingAnUndeclaredRow: Sentence<QueriesProof<readonly [typeof everywhere], readonly []>> =
	'the query "everywhere" reads the row "note", which this feature does not declare';
