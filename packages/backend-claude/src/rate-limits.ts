import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, RateLimitEvent, RateLimitWindow, RawPayload } from "@antumbra/vocabulary/session-events";

type RateLimitMessage = Extract<SDKMessage, { type: "rate_limit_event" }>;
type Info = RateLimitMessage["rate_limit_info"];
type Status = (typeof RateLimitEvent.Type)["status"];
type Window = typeof RateLimitWindow.Type;
type WindowShape = Pick<Window, "durationMinutes" | "model">;

const STATUS: Record<Info["status"], Status> = {
	allowed: "allowed",
	allowed_warning: "warning",
	rejected: "rejected",
};

const FIVE_HOURS = 5 * 60;
const SEVEN_DAYS = 7 * 24 * 60;

const WINDOWS: Record<NonNullable<Info["rateLimitType"]>, WindowShape> = {
	five_hour: { durationMinutes: FIVE_HOURS },
	overage: {},
	seven_day: { durationMinutes: SEVEN_DAYS },
	seven_day_opus: { durationMinutes: SEVEN_DAYS, model: "opus" },
	seven_day_overage_included: { durationMinutes: SEVEN_DAYS },
	seven_day_sonnet: { durationMinutes: SEVEN_DAYS, model: "sonnet" },
};

const windowsOf = (info: Info): ReadonlyArray<Window> => {
	if (info.utilization === undefined) {
		return [];
	}
	return [
		{
			...(info.rateLimitType === undefined ? {} : WINDOWS[info.rateLimitType]),
			...(info.resetsAt === undefined ? {} : { resetsAt: info.resetsAt * 1000 }),
			usedPercent: Math.round(info.utilization * 100),
		},
	];
};

export const rateLimitEvent = (raw: RawPayload, message: RateLimitMessage): AgentEvent => ({
	raw,
	status: STATUS[message.rate_limit_info.status],
	type: "rate.limit",
	windows: windowsOf(message.rate_limit_info),
});
