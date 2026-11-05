import { Schema } from "effect";
import { command } from "#command.ts";
import { fact } from "#fact.ts";
import type { CommandsProof, QueriesProof } from "#proof.ts";
import { query } from "#query.ts";
import { row } from "#row.ts";

const note = row("note", { id: Schema.String, text: Schema.String }, { key: "id" });
const noted = fact("Noted", { id: Schema.String });
const write = command("write", { input: { id: Schema.String }, reads: [note], emits: noted, rejections: {} });
const all = query("all", { input: {}, output: Schema.Array(note.Row), reads: [note] });
type Sentence<Proof extends readonly unknown[]> = keyof Proof[number];
export const unknownFact: Sentence<CommandsProof<readonly [typeof write], readonly [], readonly [typeof note]>> =
	'the command "write" emits the fact "Noted", which this feature does not declare';
export const unknownCommandRow: Sentence<CommandsProof<readonly [typeof write], readonly [typeof noted], readonly []>> =
	'the command "write" reads the row "note", which this feature does not declare';
export const unknownQueryRow: Sentence<QueriesProof<readonly [typeof all], readonly []>> =
	'the query "all" reads the row "note", which this feature does not declare';
export const validCommand: CommandsProof<readonly [typeof write], readonly [typeof noted], readonly [typeof note]> = [write];
export const validQuery: QueriesProof<readonly [typeof all], readonly [typeof note]> = [all];
