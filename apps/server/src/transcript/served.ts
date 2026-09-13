import type { sessionOpening } from "@antumbra/domain-sessions/rows/session-opening.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import type { TranscriptItem, TranscriptMessage } from "@antumbra/domain-sessions/rows/transcript.ts";
import { wakeWords } from "@antumbra/platform-prompts/wake.ts";

type Opening = typeof sessionOpening.Row.Type;
type Instruction = typeof sessionOperation.Row.Type;

interface Served {
	readonly delivered: string;
	readonly inputId: string;
	readonly turn: TranscriptMessage;
}

const chartered = (opening: Opening): Served => {
	const charter = opening.charter.trim();
	const orders = opening.standingOrders?.trim() ?? "";
	return {
		delivered: charter,
		inputId: opening.inputId,
		turn: {
			kind: "message",
			parts: [],
			role: "user",
			seq: opening.sequence,
			served: "charter",
			...(orders === "" ? {} : { standingOrders: orders }),
			text: charter,
		},
	};
};

const instructed = (instruction: Instruction): Served => {
	const said = instruction.reason.trim();
	const words = said === "" ? wakeWords.trim() : said;
	return {
		delivered: words,
		inputId: instruction.id,
		turn: {
			kind: "message",
			parts: [],
			role: "user",
			seq: instruction.sequence,
			served: instruction.kind === "steer" ? "steer" : "wake",
			text: words,
		},
	};
};

const echoOf = (one: Served, ordered: ReadonlyArray<TranscriptItem>): TranscriptItem | null => {
	for (const item of ordered) {
		if (item.kind === "message" && item.role === "user" && item.inputId === one.inputId) return item;
	}
	for (const item of ordered) {
		if (item.seq < one.turn.seq || item.kind !== "message" || item.role !== "user") continue;
		return item.text === one.delivered ? item : null;
	}
	return null;
};

export const withServedTurns = (
	items: ReadonlyArray<TranscriptItem>,
	opening: Opening | null,
	instructions: ReadonlyArray<Instruction>,
): ReadonlyArray<TranscriptItem> => {
	const served: Served[] = [];
	if (opening !== null) served.push(chartered(opening));
	for (const instruction of instructions) served.push(instructed(instruction));
	if (served.length === 0) return items;
	const ordered = items.toSorted((first, second) => first.seq - second.seq);
	const echoes = new Set<TranscriptItem>();
	for (const one of served) {
		const echo = echoOf(one, ordered);
		if (echo !== null) echoes.add(echo);
	}
	const kept: TranscriptItem[] = [];
	for (const item of ordered) {
		if (!echoes.has(item)) kept.push(item);
	}
	for (const one of served) kept.push(one.turn);
	return kept.toSorted((first, second) => first.seq - second.seq);
};
