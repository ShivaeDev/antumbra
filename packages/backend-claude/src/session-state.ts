import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
	AgentEvent,
	RawPayload,
	SessionState,
} from "@antumbra/vocabulary/session-events";

type StateMessage = Extract<SDKMessage, { subtype: "session_state_changed" }>;
type TasksMessage = Extract<
	SDKMessage,
	{ subtype: "background_tasks_changed" }
>;

// why: the SDK's three words for what a session is doing, mapped onto the
// neutral three. `requires_action` is a turn that is alive and stalled on
// somebody answering — a permission prompt, an elicitation — which is what
// `awaiting-input` names everywhere else in this record.
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

// why: the frame carries the whole live set on every membership change and
// says to replace rather than to pair edges, so the event says the same. An
// empty `tasks` is the provider stating that nothing is running in the
// background, which is worth recording — the SDK sends nothing at startup, so
// silence and emptiness are different facts.
const backgroundEvent = (
	raw: RawPayload,
	message: TasksMessage,
): AgentEvent => ({
	raw,
	tasks: message.tasks.map((task) => ({
		description: task.description,
		id: task.task_id,
		kind: task.task_type,
	})),
	type: "session.background",
});

type SystemMessage = Extract<SDKMessage, { type: "system" }>;

// why: the system lane carries several unrelated things and this is the one
// reading of it. Two subtypes are facts about the session worth keeping.
//
// why: progress is telemetry, and a record that kept every tick of it would
// drown the frames that say what happened. Estimates and running totals are
// dropped; what a progress frame names about the identity of the work is read
// elsewhere, before the frame reaches here.
//
// why: undefined means this lane has nothing to say about the frame, which is
// not the same as the empty array — the task subtypes are read further down as
// subsession lifecycle and must fall through rather than be swallowed here.
export const systemEvents = (
	raw: RawPayload,
	message: SystemMessage,
): ReadonlyArray<AgentEvent> | undefined => {
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
