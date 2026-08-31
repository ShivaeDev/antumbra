import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";

export const attributed = (event: AgentEvent, origin: Origin): AgentEvent => {
	switch (event.type) {
		case "message":
		case "raw":
		case "subsession.gap":
		case "thinking":
		case "tool.completed":
		case "tool.started":
		case "turn.completed":
		case "usage":
			return { ...event, origin };
		default:
			return event;
	}
};
