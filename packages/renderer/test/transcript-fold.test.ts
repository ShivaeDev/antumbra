import { expect, it } from "vitest";
import { foldToolRuns } from "#transcript/fold.ts";
import type { TranscriptItem } from "#transcript/model.ts";

const tool = (seq: number, name: string, result?: string): TranscriptItem => ({
	input: "{}",
	kind: "tool",
	name,
	ok: result === undefined ? undefined : true,
	result,
	seq,
});

const said = (seq: number, text: string): TranscriptItem => ({
	inputId: undefined,
	kind: "message",
	parts: [{ text, type: "text" }],
	role: "agent",
	seq,
	text,
});

const thought = (seq: number, text: string): TranscriptItem => ({
	kind: "thinking",
	seq,
	text,
});

it("folds a run of settled calls between messages into one item", () => {
	const items = [
		said(0, "looking"),
		tool(1, "Read", "a"),
		tool(2, "Grep", "b"),
		tool(3, "Read", "c"),
		said(4, "found it"),
	];
	const folded = foldToolRuns(items);
	expect(folded).toEqual([
		items[0],
		{ entries: [items[1], items[2], items[3]], kind: "toolRun", seq: 1 },
		items[4],
	]);
});

it("leaves a single call where it stands", () => {
	const items = [said(0, "one"), tool(1, "Read", "a"), said(2, "two")];
	expect(foldToolRuns(items)).toEqual(items);
});

it("folds thinking between calls and leaves thinking around them out", () => {
	const items = [
		thought(0, "which file"),
		tool(1, "Read", "a"),
		thought(2, "now the other"),
		tool(3, "Read", "b"),
		thought(4, "that settles it"),
		said(5, "done"),
	];
	const folded = foldToolRuns(items);
	expect(folded).toEqual([
		items[0],
		{ entries: [items[1], items[2], items[3]], kind: "toolRun", seq: 1 },
		items[4],
		items[5],
	]);
});

it("keeps the call still out on its own line and folds what settled", () => {
	const items = [tool(0, "Read", "a"), tool(1, "Bash", "b"), tool(2, "Edit")];
	expect(foldToolRuns(items)).toEqual([
		{ entries: [items[0], items[1]], kind: "toolRun", seq: 0 },
		items[2],
	]);
});

it("folds an unsettled call that a later one has already overtaken", () => {
	const items = [tool(0, "Bash"), tool(1, "Read", "b"), said(2, "meanwhile")];
	expect(foldToolRuns(items)).toEqual([
		{ entries: [items[0], items[1]], kind: "toolRun", seq: 0 },
		items[2],
	]);
});

it("breaks a run at anything that is not a call or a thought", () => {
	const items = [
		tool(0, "Read", "a"),
		{ kind: "telemetry", label: "usage", seq: 1 } as const,
		tool(2, "Read", "b"),
	];
	expect(foldToolRuns(items)).toEqual(items);
});
