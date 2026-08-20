import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
	AgentEvent,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import {
	type Ending,
	endedEvent,
	notifiedEnding,
	reportedEnding,
	updatedEnding,
} from "#subsession-endings.ts";

const LOCAL_AGENT = "local_agent";

type SystemMessage = Extract<SDKMessage, { type: "system" }>;
type TaskStarted = Extract<SystemMessage, { subtype: "task_started" }>;
type Opened = Extract<AgentEvent, { type: "subsession.opened" }>;

// why: a background shell command is a task too, and only local_agent tasks are
// subsessions. task_id is the agent id the subsession's own frames are attributed
// under, so the node needs no identity of Antumbra's own making. What the frame
// does not say is left unsaid rather than written as an empty string.
const openedEvent = (
	raw: RawPayload,
	message: TaskStarted,
): Opened | undefined => {
	if (message.task_type !== LOCAL_AGENT || message.tool_use_id === undefined) {
		return undefined;
	}
	return {
		...(message.prompt === undefined ? {} : { charter: message.prompt }),
		...(message.subagent_type === undefined
			? {}
			: { kind: message.subagent_type }),
		...(message.description === "" ? {} : { label: message.description }),
		raw,
		spawnedBy: message.tool_use_id,
		subsessionRef: message.task_id,
		type: "subsession.opened",
	};
};

export interface Subsessions {
	readonly events: (
		raw: RawPayload,
		message: SDKMessage,
	) => ReadonlyArray<AgentEvent>;
	// why: the tool call a node was spawned by is stated once, in the frame that
	// started it, and is needed again long after that frame is gone — to attribute
	// something recovered from the node's stored transcript back to the node. What
	// this never forgets is therefore wider than what is still open.
	readonly spawnerOf: (subsessionRef: string) => string | undefined;
}

// why: task_updated and task_notification name a task_id and never a task_type,
// so a mapping that read each frame alone would end a subsession every time a
// background shell command finished. Remembering which task ids opened as
// local_agent is the whole state this needs: the first terminal frame for a
// remembered id closes the node with whatever that frame knows, and later
// frames about the same id fall through to raw instead of ending it twice.
export const openSubsessions = (): Subsessions => {
	const open = new Set<string>();
	const spawners = new Map<string, string>();
	const close = (
		raw: RawPayload,
		ending: Ending | undefined,
	): ReadonlyArray<AgentEvent> =>
		ending === undefined || !open.delete(ending.subsessionRef)
			? []
			: [endedEvent(raw, ending)];
	return {
		events: (raw, message) => {
			if (message.type !== "system") {
				return close(raw, reportedEnding(message));
			}
			if (message.subtype === "task_started") {
				const opened = openedEvent(raw, message);
				if (opened === undefined) {
					return [];
				}
				open.add(message.task_id);
				spawners.set(message.task_id, opened.spawnedBy);
				return [opened];
			}
			if (message.subtype === "task_updated") {
				return close(raw, updatedEnding(message));
			}
			return message.subtype === "task_notification"
				? close(raw, notifiedEnding(message))
				: [];
		},
		spawnerOf: (subsessionRef) => spawners.get(subsessionRef),
	};
};
