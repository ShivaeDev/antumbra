import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, RawPayload, SessionState } from "@antumbra/vocabulary/session-events";

type StateMessage = Extract<SDKMessage, { subtype: "session_state_changed" }>;
type TasksMessage = Extract<SDKMessage, { subtype: "background_tasks_changed" }>;

const STATE: Record<StateMessage["state"], SessionState> = {
	idle: "idle",
	requires_action: "awaiting-input",
	running: "running",
};

const stateEvent = (raw: RawPayload, message: StateMessage): AgentEvent => ({
	raw,
	state: STATE[message.state],
	type: "session.state",
});

// `background_tasks_changed` carries the complete live set; an empty set is distinct from startup silence.
const backgroundEvent = (raw: RawPayload, message: TasksMessage): AgentEvent => ({
	raw,
	tasks: message.tasks.map((task) => ({
		description: task.description,
		id: task.task_id,
		kind: task.task_type,
	})),
	type: "session.background",
});

type SystemMessage = Extract<SDKMessage, { type: "system" }>;

export const systemEvents = (raw: RawPayload, message: SystemMessage): ReadonlyArray<AgentEvent> | undefined => {
	switch (message.subtype) {
		case "init":
			return [{ nativeRef: message.session_id, raw, type: "session.opened" }];
		case "session_state_changed":
			return [stateEvent(raw, message)];
		case "background_tasks_changed":
			return [backgroundEvent(raw, message)];
		case "thinking_tokens":
		case "task_progress":
			return [];
		default:
			return undefined;
	}
};
