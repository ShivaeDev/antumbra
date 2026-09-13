import type { SessionSpend, SessionStanding } from "@antumbra/domain-sessions/rows/transcript-standing.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { BackgroundTask, SessionState } from "@antumbra/platform-vocabulary/session-events/state.ts";
import type { UsageEvent } from "@antumbra/platform-vocabulary/session-events/usage.ts";
import type { SessionEvent, SessionTreeNode } from "#transcript/types.ts";

type OpenTool = SessionStanding["open"][number];

interface Spend {
	cost: number | null;
	missing: boolean;
}

interface Folding {
	background: ReadonlyArray<BackgroundTask>;
	readonly models: Map<string, Spend>;
	readonly open: Map<string, OpenTool>;
	readonly spend: Spend;
	state: SessionState | undefined;
	usage: typeof UsageEvent.Type | undefined;
}

const nothingSpent = (): Spend => ({ cost: null, missing: false });

const bill = (held: Spend, costUsd: number | undefined): void => {
	if (costUsd === undefined) {
		held.missing = true;
		return;
	}
	held.cost = (held.cost ?? 0) + costUsd;
};

const spendOn = (models: Map<string, Spend>, model: string): Spend => {
	const held = models.get(model);
	if (held !== undefined) {
		return held;
	}
	const fresh = nothingSpent();
	models.set(model, fresh);
	return fresh;
};

const priced = (held: Spend): SessionSpend => ({ costPartial: held.cost !== null && held.missing, costUsd: held.cost });

const countModels = (fold: Folding, event: typeof UsageEvent.Type): void => {
	for (const spent of event.byModel) {
		bill(fold.spend, spent.costUsd);
		bill(spendOn(fold.models, spent.model), spent.costUsd);
	}
};

const belongsToNode = (event: AgentEvent, delegate: boolean): boolean => delegate || !("origin" in event) || event.origin === undefined;

const step = (fold: Folding, event: AgentEvent): void => {
	switch (event.type) {
		case "session.state":
			fold.state = event.state;
			return;
		case "session.background":
			fold.background = event.tasks;
			return;
		case "usage":
			fold.usage = event;
			countModels(fold, event);
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

export const sessionStanding = (events: ReadonlyArray<SessionEvent>, node?: SessionTreeNode | undefined): SessionStanding => {
	const delegate = node !== undefined && node.depth > 0;
	const fold: Folding = { background: [], models: new Map(), open: new Map(), spend: nothingSpent(), state: undefined, usage: undefined };
	for (const row of events) {
		if (belongsToNode(row.event, delegate)) {
			step(fold, row.event);
		}
	}
	return {
		background: fold.background,
		models: [...fold.models].map(([model, held]) => ({ ...priced(held), model })),
		open: [...fold.open.values()],
		spend: priced(fold.spend),
		state: fold.state,
		usage: fold.usage,
	};
};
