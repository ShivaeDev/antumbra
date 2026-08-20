import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";

// why: attribution rides every event a node produced, so its words, its spend,
// its turn endings and whatever had no neutral shape all reach its own journal
// instead of the journal of the session that merely happened to be listening.
// A subsession's own lifecycle is not among them: opening and ending are facts
// about the turn that spawned it, and those are filed by reference.
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
