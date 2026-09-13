import type { SessionModelSpend, SessionSpend, SessionStanding, SessionTokens } from "@antumbra/domain-sessions/rows/transcript-standing.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { ModelUsage, UsageEvent } from "@antumbra/platform-vocabulary/session-events/usage.ts";
import { rateLimitWindows } from "#transcript/rate-limit-label.ts";
import type { SessionEvent, SessionTreeNode } from "#transcript/types.ts";

type OpenTool = SessionStanding["open"][number];

interface Spend {
	cost: number | null;
	missing: boolean;
}

interface Tally extends Spend {
	cacheReadTokens: number;
	cacheWriteTokens: number;
	inputTokens: number;
	outputTokens: number;
}

interface Folding {
	readonly models: Map<string, Tally>;
	readonly open: Map<string, OpenTool>;
	rateLimit: string | undefined;
	readonly session: Tally;
	turn: Spend;
}

const nothingSpent = (): Spend => ({ cost: null, missing: false });

const nothingCounted = (): Tally => ({ ...nothingSpent(), cacheReadTokens: 0, cacheWriteTokens: 0, inputTokens: 0, outputTokens: 0 });

const bill = (held: Spend, costUsd: number | undefined): void => {
	if (costUsd === undefined) {
		held.missing = true;
		return;
	}
	held.cost = (held.cost ?? 0) + costUsd;
};

const tallyOn = (models: Map<string, Tally>, model: string): Tally => {
	const held = models.get(model);
	if (held !== undefined) {
		return held;
	}
	const fresh = nothingCounted();
	models.set(model, fresh);
	return fresh;
};

const priced = (held: Spend): SessionSpend => ({ costPartial: held.cost !== null && held.missing, costUsd: held.cost });

const tokensOf = (held: Tally): SessionTokens => ({
	cacheReadTokens: held.cacheReadTokens,
	cacheWriteTokens: held.cacheWriteTokens,
	inputTokens: held.inputTokens,
	outputTokens: held.outputTokens,
});

const add = (held: Tally, spent: ModelUsage): void => {
	held.cacheReadTokens += spent.cacheReadTokens ?? 0;
	held.cacheWriteTokens += spent.cacheWriteTokens ?? 0;
	held.inputTokens += spent.inputTokens;
	held.outputTokens += spent.outputTokens;
	bill(held, spent.costUsd);
};

const count = (fold: Folding, event: typeof UsageEvent.Type): void => {
	const turn = nothingSpent();
	for (const spent of event.byModel) {
		add(fold.session, spent);
		add(tallyOn(fold.models, spent.model), spent);
		bill(turn, spent.costUsd);
	}
	fold.turn = turn;
};

const belongsToNode = (event: AgentEvent, delegate: boolean): boolean => delegate || !("origin" in event) || event.origin === undefined;

const step = (fold: Folding, event: AgentEvent): void => {
	switch (event.type) {
		case "usage":
			count(fold, event);
			return;
		case "rate.limit":
			fold.rateLimit = rateLimitWindows(event);
			return;
		case "tool.started":
			fold.open.set(event.toolId, { name: event.name });
			return;
		case "tool.completed":
			fold.open.delete(event.toolId);
			return;
		default:
			return;
	}
};

const spentOn = ([model, held]: readonly [string, Tally]): SessionModelSpend => ({ ...priced(held), ...tokensOf(held), model });

export const sessionStanding = (events: ReadonlyArray<SessionEvent>, node?: SessionTreeNode | undefined): SessionStanding => {
	const delegate = node !== undefined && node.depth > 0;
	const fold: Folding = { models: new Map(), open: new Map(), rateLimit: undefined, session: nothingCounted(), turn: nothingSpent() };
	for (const row of events) {
		if (belongsToNode(row.event, delegate)) {
			step(fold, row.event);
		}
	}
	return {
		models: [...fold.models].map(spentOn),
		open: [...fold.open.values()],
		rateLimit: fold.rateLimit,
		spend: priced(fold.session),
		tokens: tokensOf(fold.session),
		turn: priced(fold.turn),
	};
};
