import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
	AgentEvent,
	RawPayload,
	SubsessionStatus,
} from "@antumbra/vocabulary/session-events";
import { isRecord, textOf } from "#blocks.ts";

const LOCAL_AGENT = "local_agent";

type SystemMessage = Extract<SDKMessage, { type: "system" }>;
type TaskStarted = Extract<SystemMessage, { subtype: "task_started" }>;
type TaskUpdated = Extract<SystemMessage, { subtype: "task_updated" }>;
type TaskNotification = Extract<
	SystemMessage,
	{ subtype: "task_notification" }
>;

interface Outcome {
	readonly durationMs: number | undefined;
	readonly status: typeof SubsessionStatus.Type;
	readonly subsessionRef: string;
	readonly summary: string | undefined;
	readonly tokens: number | undefined;
}

// why: a background shell command is a task too, and only local_agent tasks are
// subsessions. task_id is the agent id the subsession's own frames are attributed
// under, so the node needs no identity of Antumbra's own making.
const openedEvent = (
	raw: RawPayload,
	message: TaskStarted,
): AgentEvent | undefined =>
	message.task_type !== LOCAL_AGENT || message.tool_use_id === undefined
		? undefined
		: {
				charter: message.prompt ?? "",
				kind: message.subagent_type ?? "",
				label: message.description,
				raw,
				spawnedBy: message.tool_use_id,
				subsessionRef: message.task_id,
				type: "subsession.opened",
			};

const endedEvent = (raw: RawPayload, outcome: Outcome): AgentEvent => ({
	...(outcome.durationMs === undefined
		? {}
		: { durationMs: outcome.durationMs }),
	raw,
	status: outcome.status,
	subsessionRef: outcome.subsessionRef,
	...(outcome.summary === undefined ? {} : { summary: outcome.summary }),
	...(outcome.tokens === undefined ? {} : { tokens: outcome.tokens }),
	type: "subsession.ended",
});

// why: there is no task_completed message — a task ends by being patched into a
// terminal status, and the patch names nothing else about the run.
const updatedOutcome = (message: TaskUpdated): Outcome | undefined => {
	const status = message.patch.status;
	return status === "completed" || status === "failed" || status === "killed"
		? {
				durationMs: undefined,
				status,
				subsessionRef: message.task_id,
				summary: undefined,
				tokens: undefined,
			}
		: undefined;
};

const notifiedOutcome = (message: TaskNotification): Outcome => ({
	durationMs: message.usage?.duration_ms,
	status: message.status === "stopped" ? "killed" : message.status,
	subsessionRef: message.task_id,
	summary: message.summary,
	tokens: message.usage?.total_tokens,
});

// why: the Agent tool's own result carries the run totals, and the docs say to
// render from it rather than parse the tool_result text.
const reportedOutcome = (message: SDKMessage): Outcome | undefined => {
	if (!("tool_use_result" in message) || !isRecord(message.tool_use_result)) {
		return undefined;
	}
	const output = message.tool_use_result;
	if (output.status !== "completed" || typeof output.agentId !== "string") {
		return undefined;
	}
	return {
		durationMs:
			typeof output.totalDurationMs === "number"
				? output.totalDurationMs
				: undefined,
		status: "completed",
		subsessionRef: output.agentId,
		summary: Array.isArray(output.content) ? textOf(output.content) : undefined,
		tokens:
			typeof output.totalTokens === "number" ? output.totalTokens : undefined,
	};
};

export interface Subsessions {
	readonly events: (
		raw: RawPayload,
		message: SDKMessage,
	) => ReadonlyArray<AgentEvent>;
}

// why: task_updated and task_notification name a task_id and never a task_type,
// so a mapping that read each frame alone would end a subsession every time a
// background shell command finished. Remembering which task ids opened as
// local_agent is the whole state this needs: the first terminal frame for a
// remembered id closes the node with whatever that frame knows, and later
// frames about the same id fall through to raw instead of ending it twice.
export const openSubsessions = (): Subsessions => {
	const open = new Set<string>();
	const close = (
		raw: RawPayload,
		outcome: Outcome | undefined,
	): ReadonlyArray<AgentEvent> =>
		outcome === undefined || !open.delete(outcome.subsessionRef)
			? []
			: [endedEvent(raw, outcome)];
	return {
		events: (raw, message) => {
			if (message.type !== "system") {
				return close(raw, reportedOutcome(message));
			}
			if (message.subtype === "task_started") {
				const opened = openedEvent(raw, message);
				if (opened === undefined) {
					return [];
				}
				open.add(message.task_id);
				return [opened];
			}
			if (message.subtype === "task_updated") {
				return close(raw, updatedOutcome(message));
			}
			return message.subtype === "task_notification"
				? close(raw, notifiedOutcome(message))
				: [];
		},
	};
};
