import type { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import type { UsageEvidence } from "@antumbra/domain-sessions/rows/usage-evidence.ts";

type ModelSpent = UsageEvidence["byModel"][number];

// A turn's totals and one model's share of them are counted the same way.
type Spent = UsageEvidence | ModelSpent;

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

const countSpent = (tally: Tally, spent: Spent): void => {
	tally.cacheReadTokens += spent.cacheReadTokens ?? 0;
	tally.cacheWriteTokens += spent.cacheWriteTokens ?? 0;
	tally.inputTokens += spent.inputTokens;
	tally.outputTokens += spent.outputTokens;
	if (spent.costUsd !== undefined) {
		tally.costTurns += 1;
		tally.costUsd += spent.costUsd;
	}
};

export const countUsage = (tally: Tally, usage: UsageEvidence): void => {
	countSpent(tally, usage);
	tally.turns += 1;
};

export const tallyAt = <Key>(tallies: Map<Key, Tally>, key: Key): Tally => {
	const held = tallies.get(key);
	if (held !== undefined) {
		return held;
	}
	const fresh = emptyTally();
	tallies.set(key, fresh);
	return fresh;
};

// One turn is one turn on every model it ran on, however many times the breakdown names that model.
export const countModels = (models: Map<string, Tally>, byModel: ReadonlyArray<ModelSpent>): void => {
	const counted = new Set<string>();
	for (const spent of byModel) {
		const tally = tallyAt(models, spent.model);
		countSpent(tally, spent);
		if (!counted.has(spent.model)) {
			counted.add(spent.model);
			tally.turns += 1;
		}
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
