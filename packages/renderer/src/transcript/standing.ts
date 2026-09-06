import type { SessionEvent, SessionTreeNode } from "@antumbra/contract";
import type { AgentEvent, BackgroundTask, SessionState, UsageEvent } from "@antumbra/vocabulary/session-events.ts";

export interface OpenTool {
	readonly name: string;
}

export interface SessionStanding {
	readonly background: ReadonlyArray<BackgroundTask>;
	readonly open: ReadonlyArray<OpenTool>;
	readonly state: SessionState | undefined;
	readonly usage: typeof UsageEvent.Type | undefined;
}

interface Folding {
	background: ReadonlyArray<BackgroundTask>;
	readonly open: Map<string, OpenTool>;
	state: SessionState | undefined;
	usage: typeof UsageEvent.Type | undefined;
}

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
	const fold: Folding = { background: [], open: new Map(), state: undefined, usage: undefined };
	for (const row of events) {
		if (row.event._tag === "Known" && belongsToNode(row.event.event, delegate)) {
			step(fold, row.event.event);
		}
	}
	return { background: fold.background, open: [...fold.open.values()], state: fold.state, usage: fold.usage };
};
