import type { sessionOpening } from "@antumbra/domain-sessions/rows/session-opening.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import type { TranscriptItem, TranscriptMessage } from "@antumbra/domain-sessions/rows/transcript.ts";
import { wakeWords } from "@antumbra/platform-prompts/wake.ts";

type Opening = typeof sessionOpening.Row.Type;
type Instruction = typeof sessionOperation.Row.Type;

interface Served {
	readonly delivered: string;
	readonly turn: TranscriptMessage;
}

const turn = (text: string, seq: number, served: "charter" | "wake"): TranscriptMessage => ({
	kind: "message",
	parts: [],
	role: "user",
	seq,
	served,
	text,
});

const chartered = (opening: Opening): Served => {
	const charter = opening.charter.trim();
	const orders = opening.standingOrders?.trim() ?? "";
	return { delivered: charter, turn: turn(orders === "" ? charter : `${orders}\n\n${charter}`, opening.sequence, "charter") };
};

const woke = (instruction: Instruction): Served => {
	const said = instruction.reason.trim();
	const words = said === "" ? wakeWords.trim() : said;
	return { delivered: words, turn: turn(words, instruction.sequence, "wake") };
};

export const withServedTurns = (
	items: ReadonlyArray<TranscriptItem>,
	opening: Opening | null,
	instructions: ReadonlyArray<Instruction>,
): ReadonlyArray<TranscriptItem> => {
	const served: Served[] = [];
	if (opening !== null) served.push(chartered(opening));
	for (const instruction of instructions) served.push(woke(instruction));
	if (served.length === 0) return items;
	const echoed = new Map<string, number>();
	for (const one of served) echoed.set(one.delivered, (echoed.get(one.delivered) ?? 0) + 1);
	const kept: TranscriptItem[] = [];
	for (const item of items) {
		if (item.kind === "message" && item.role === "user") {
			const outstanding = echoed.get(item.text) ?? 0;
			if (outstanding > 0) {
				echoed.set(item.text, outstanding - 1);
				continue;
			}
		}
		kept.push(item);
	}
	for (const one of served) kept.push(one.turn);
	return kept.toSorted((first, second) => first.seq - second.seq);
};
