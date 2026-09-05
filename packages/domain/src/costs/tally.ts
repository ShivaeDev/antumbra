import type { UsageTotal } from "@antumbra/contract";
import type { UsageEvent } from "@antumbra/vocabulary/session-events";

type Usage = typeof UsageEvent.Type;

export interface Tally {
	cacheReadTokens: number;
	cacheWriteTokens: number;
	costTurns: number;
	costUsd: number;
	inputTokens: number;
	outputTokens: number;
	turns: number;
}

export const emptyTally = (): Tally => ({
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	costTurns: 0,
	costUsd: 0,
	inputTokens: 0,
	outputTokens: 0,
	turns: 0,
});

export const countUsage = (tally: Tally, usage: Usage): void => {
	tally.cacheReadTokens += usage.cacheReadTokens ?? 0;
	tally.cacheWriteTokens += usage.cacheWriteTokens ?? 0;
	tally.inputTokens += usage.inputTokens;
	tally.outputTokens += usage.outputTokens;
	tally.turns += 1;
	if (usage.costUsd !== undefined) {
		tally.costTurns += 1;
		tally.costUsd += usage.costUsd;
	}
};

export const totalOf = (tally: Tally): UsageTotal => ({
	cacheReadTokens: tally.cacheReadTokens,
	cacheWriteTokens: tally.cacheWriteTokens,
	costPartial: tally.costTurns > 0 && tally.costTurns < tally.turns,
	costUsd: tally.costTurns === 0 ? null : tally.costUsd,
	inputTokens: tally.inputTokens,
	outputTokens: tally.outputTokens,
	turns: tally.turns,
});

export const tallyAt = <Key>(tallies: Map<Key, Tally>, key: Key): Tally => {
	const held = tallies.get(key);
	if (held !== undefined) {
		return held;
	}
	const fresh = emptyTally();
	tallies.set(key, fresh);
	return fresh;
};
