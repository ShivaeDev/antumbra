import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";

export interface Activity {
	working: boolean;
	readonly tools: Set<string>;
	readonly children: Set<string>;
	background: number;
	audits: number;
}
export const activity = (): Activity => ({ working: false, tools: new Set(), children: new Set(), background: 0, audits: 0 });
export const settled = (state: Activity): boolean =>
	!state.working && state.tools.size === 0 && state.children.size === 0 && state.background === 0 && state.audits === 0;
export const observeActivity = (state: Activity, event: AgentEvent): void => {
	switch (event.type) {
		case "turn.completed":
			if (event.origin === undefined) state.working = false;
			break;
		case "session.state":
			if (event.origin === undefined) state.working = event.state === "running";
			break;
		case "tool.started":
			state.tools.add(event.toolId);
			break;
		case "tool.completed":
			state.tools.delete(event.toolId);
			break;
		case "subsession.opened":
			state.children.add(event.subsessionRef);
			break;
		case "subsession.ended":
			state.children.delete(event.subsessionRef);
			break;
		case "session.background":
			state.background = event.tasks.length;
			break;
	}
};

export const observeCensus = (state: Activity, nodes: ReadonlyArray<{ readonly nodeRef: string; readonly working: boolean }>): void => {
	for (const node of nodes) {
		if (node.working) state.children.add(node.nodeRef);
		else state.children.delete(node.nodeRef);
	}
};
