interface ModelPrice {
	readonly cacheRead: number;
	readonly cacheWrite: number;
	readonly input: number;
	readonly output: number;
}

interface Spent {
	readonly cacheReadTokens?: number | undefined;
	readonly cacheWriteTokens?: number | undefined;
	readonly inputTokens: number;
	readonly outputTokens: number;
}

const PER_MILLION = 1_000_000;

// A round with more input tokens than this bills at the long-context rates of the models that publish them.
const LONG_CONTEXT_TOKENS = 272_000;

// Dollars per million tokens, as each provider publishes them. A model absent here is one Antumbra cannot price, and its turns read as unreported.
const LIST: Record<string, ModelPrice> = {
	"claude-fable-5-1": { cacheRead: 0.25, cacheWrite: 12.5, input: 10, output: 50 },
	"claude-fable-5": { cacheRead: 1, cacheWrite: 12.5, input: 10, output: 50 },
	"claude-haiku-4-5": { cacheRead: 0.1, cacheWrite: 1.25, input: 1, output: 5 },
	"claude-opus-4-1": { cacheRead: 1.5, cacheWrite: 18.75, input: 15, output: 75 },
	"claude-opus-4-5": { cacheRead: 0.5, cacheWrite: 6.25, input: 5, output: 25 },
	"claude-opus-4-6": { cacheRead: 0.5, cacheWrite: 6.25, input: 5, output: 25 },
	"claude-opus-4-7": { cacheRead: 0.5, cacheWrite: 6.25, input: 5, output: 25 },
	"claude-opus-4-8": { cacheRead: 0.5, cacheWrite: 6.25, input: 5, output: 25 },
	"claude-opus-5": { cacheRead: 0.5, cacheWrite: 6.25, input: 5, output: 25 },
	"claude-sonnet-4-5": { cacheRead: 0.3, cacheWrite: 3.75, input: 3, output: 15 },
	"claude-sonnet-4-6": { cacheRead: 0.3, cacheWrite: 3.75, input: 3, output: 15 },
	"claude-sonnet-5": { cacheRead: 0.2, cacheWrite: 2.5, input: 2, output: 10 },
	"gpt-5.3-codex": { cacheRead: 0.175, cacheWrite: 1.75, input: 1.75, output: 14 },
	"gpt-5.6-cyber": { cacheRead: 1.25, cacheWrite: 15.625, input: 12.5, output: 75 },
	"gpt-5.6-luna": { cacheRead: 0.02, cacheWrite: 0.25, input: 0.2, output: 1.2 },
	"gpt-5.6-sol": { cacheRead: 0.4, cacheWrite: 5, input: 4, output: 20 },
	"gpt-5.6-terra": { cacheRead: 0.2, cacheWrite: 2.5, input: 2, output: 12 },
	"gpt-6-astra": { cacheRead: 1, cacheWrite: 12.5, input: 10, output: 50 },
};

const LONG: Record<string, ModelPrice> = {
	"gpt-5.6-luna": { cacheRead: 0.04, cacheWrite: 0.5, input: 0.4, output: 1.8 },
	"gpt-5.6-sol": { cacheRead: 0.8, cacheWrite: 10, input: 8, output: 30 },
	"gpt-5.6-terra": { cacheRead: 0.4, cacheWrite: 5, input: 4, output: 18 },
	"gpt-6-astra": { cacheRead: 2, cacheWrite: 25, input: 20, output: 75 },
};

const bare = (model: string): string => model.slice(model.lastIndexOf("/") + 1);

export const listPrice = (model: string, spent: Spent): number | undefined => {
	const named = bare(model);
	const price = (spent.inputTokens > LONG_CONTEXT_TOKENS ? LONG[named] : undefined) ?? LIST[named];
	if (price === undefined) {
		return undefined;
	}
	const dollars =
		spent.inputTokens * price.input +
		spent.outputTokens * price.output +
		(spent.cacheReadTokens ?? 0) * price.cacheRead +
		(spent.cacheWriteTokens ?? 0) * price.cacheWrite;
	return dollars / PER_MILLION;
};
