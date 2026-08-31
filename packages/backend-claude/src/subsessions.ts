import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, RawPayload } from "@antumbra/vocabulary/session-events";
import { type Ending, endedEvent, notifiedEnding, reportedEnding, updatedEnding } from "#subsession-endings.ts";

const LOCAL_AGENT = "local_agent";

type SystemMessage = Extract<SDKMessage, { type: "system" }>;
type TaskStarted = Extract<SystemMessage, { subtype: "task_started" }>;
type Opened = Extract<AgentEvent, { type: "subsession.opened" }>;

const openedEvent = (raw: RawPayload, message: TaskStarted): Opened | undefined => {
	if (message.task_type !== LOCAL_AGENT || message.tool_use_id === undefined) {
		return undefined;
	}
	return {
		...(message.prompt === undefined ? {} : { charter: message.prompt }),
		...(message.subagent_type === undefined ? {} : { kind: message.subagent_type }),
		...(message.description === "" ? {} : { label: message.description }),
		raw,
		spawnedBy: message.tool_use_id,
		subsessionRef: message.task_id,
		type: "subsession.opened",
	};
};

interface Subsessions {
	readonly events: (raw: RawPayload, message: SDKMessage) => ReadonlyArray<AgentEvent>;
	readonly spawnerOf: (subsessionRef: string) => string | undefined;
}

// Task updates and notifications omit `task_type`, so only ids observed opening as `local_agent` can close a subsession.
export const openSubsessions = (): Subsessions => {
	const open = new Set<string>();
	const spawners = new Map<string, string>();
	const close = (raw: RawPayload, ending: Ending | undefined): ReadonlyArray<AgentEvent> =>
		ending === undefined || !open.delete(ending.subsessionRef) ? [] : [endedEvent(raw, ending)];
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
			return message.subtype === "task_notification" ? close(raw, notifiedEnding(message)) : [];
		},
		spawnerOf: (subsessionRef) => spawners.get(subsessionRef),
	};
};
