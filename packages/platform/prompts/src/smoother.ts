import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";
import { proseOf, section } from "#prose.ts";

const SmoothedEntry = Schema.Struct({
	at: Schema.String,
	body: Schema.String,
	kind: Schema.String,
	role: Schema.String,
});

const EntriesToSmooth = Schema.Struct({
	day: Schema.String,
	entries: Schema.Array(SmoothedEntry),
});
export type EntriesToSmooth = typeof EntriesToSmooth.Type;

const PieceToSmooth = Schema.Struct({
	entries: Schema.Array(SmoothedEntry),
	piece: Schema.String,
});
export type PieceToSmooth = typeof PieceToSmooth.Type;

const ORDERS = [
	"You write the settled account of one board. You are given a stretch of its entries, oldest first, and you write the summary that stands in for them.",
	"Write one to a few short paragraphs, sixty to a hundred and fifty words, in plain prose. No lists, no headings, no bold.",
	"Say what happened and what it leaves the next reader to act on. Leave out what only repeats another entry.",
	"Carry every question still open and every decision still standing across word for word: whoever reads your summary may never open the entries behind it.",
	"Call `write_summary` once with the whole summary. It is the only thing you do.",
].join("\n\n");

export const smootherWords: AgentPrompt = agentPrompt(ORDERS);

const PIECE_ORDERS = [
	"You write the settled account of one piece of work. You are given the whole of its board, oldest first, and you write the summary that stands in for it.",
	"Write one to a few short paragraphs, sixty to a hundred and fifty words, in plain prose. No lists, no headings, no bold.",
	"Say what came of the piece: what was done, what landed — name the Changes and Reports the entries name — and what was left open.",
	"Carry every question still standing across word for word: whoever reads your summary may never open the entries behind it.",
	"Call `write_summary` once with the whole summary. It is the only thing you do.",
].join("\n\n");

export const pieceSmootherWords: AgentPrompt = agentPrompt(PIECE_ORDERS);

const entryLines = (entry: typeof SmoothedEntry.Type): string => `[${entry.at} · ${entry.role} · ${entry.kind}]\n${entry.body}`;

export const entriesToSmooth = (input: EntriesToSmooth): AgentPrompt =>
	agentPrompt(proseOf([section(`Entries from ${input.day}`, input.entries.map(entryLines).join("\n\n"))]));

export const pieceToSmooth = (input: PieceToSmooth): AgentPrompt =>
	agentPrompt(proseOf([section(`The board of ${input.piece}`, input.entries.map(entryLines).join("\n\n"))]));
