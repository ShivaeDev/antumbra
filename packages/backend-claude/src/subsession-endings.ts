import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
	AgentEvent,
	RawPayload,
	SubsessionOutcome,
} from "@antumbra/vocabulary/session-events";
import { isRecord, textOf } from "#blocks.ts";

type SystemMessage = Extract<SDKMessage, { type: "system" }>;
type TaskUpdated = Extract<SystemMessage, { subtype: "task_updated" }>;
type TaskNotification = Extract<
	SystemMessage,
	{ subtype: "task_notification" }
>;

export interface Ending {
	readonly durationMs: number | undefined;
	readonly outcome: typeof SubsessionOutcome.Type;
	readonly subsessionRef: string;
	readonly summary: string | undefined;
	readonly tokens: number | undefined;
}

export const endedEvent = (raw: RawPayload, ending: Ending): AgentEvent => ({
	...(ending.durationMs === undefined ? {} : { durationMs: ending.durationMs }),
	outcome: ending.outcome,
	raw,
	subsessionRef: ending.subsessionRef,
	...(ending.summary === undefined ? {} : { summary: ending.summary }),
	...(ending.tokens === undefined ? {} : { tokens: ending.tokens }),
	type: "subsession.ended",
});

const LIVE = new Set(["paused", "pending", "running"]);

// why: a terminal word this vocabulary does not own is recorded as unknown
// rather than bent into the nearest one it does; the provider's own word stays
// legible in raw, so nothing is lost by refusing to guess.
const patchedOutcome = (status: string): typeof SubsessionOutcome.Type => {
	if (status === "completed") return "completed";
	return status === "failed" ? "failed" : "unknown";
};

// why: there is no task_completed message — a task ends by being patched out of
// its live states, and the patch names nothing else about the run.
export const updatedEnding = (message: TaskUpdated): Ending | undefined => {
	const status = message.patch.status;
	if (status === undefined || LIVE.has(status)) return undefined;
	return {
		durationMs: undefined,
		outcome: patchedOutcome(status),
		subsessionRef: message.task_id,
		summary: undefined,
		tokens: undefined,
	};
};

// why: a notification's 'stopped' is the provider saying the task was stopped
// on request, which this vocabulary calls interrupted.
export const notifiedEnding = (message: TaskNotification): Ending => ({
	durationMs: message.usage?.duration_ms,
	outcome: message.status === "stopped" ? "interrupted" : message.status,
	subsessionRef: message.task_id,
	summary: message.summary,
	tokens: message.usage?.total_tokens,
});

// why: the Agent tool's own result carries the run totals, and the docs say to
// render from it rather than parse the tool_result text.
export const reportedEnding = (message: SDKMessage): Ending | undefined => {
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
		outcome: "completed",
		subsessionRef: output.agentId,
		summary: Array.isArray(output.content) ? textOf(output.content) : undefined,
		tokens:
			typeof output.totalTokens === "number" ? output.totalTokens : undefined,
	};
};
