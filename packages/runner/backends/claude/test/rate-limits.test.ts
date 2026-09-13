import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { describe, expect, it } from "vitest";
import { openSessionMapping } from "#mapping.ts";

type Info = Extract<SDKMessage, { type: "rate_limit_event" }>["rate_limit_info"];

const SESSION = "57723c86-0b0c-4db1-9c79-1ae37fc5ef4a";

const frame = (info: Info): SDKMessage => ({
	rate_limit_info: info,
	session_id: SESSION,
	type: "rate_limit_event",
	uuid: "9d0d0c62-05de-45b7-9a34-a0f3b1f4b4dd",
});

const mapped = (info: Info) => openSessionMapping().frame(frame(info));

describe("claude's rate limit frames are telemetry, not raw", () => {
	it("a window's share and reset are read into a percentage and an epoch", () => {
		const info: Info = {
			rateLimitType: "five_hour",
			resetsAt: 1787180346,
			status: "allowed_warning",
			utilization: 0.8,
		};
		expect(mapped(info)).toEqual([
			{
				raw: {
					kind: "rate_limit_event",
					payload: JSON.stringify(frame(info)),
					source: "claude",
				},
				status: "warning",
				type: "rate.limit",
				windows: [{ durationMinutes: 300, resetsAt: 1787180346000, usedPercent: 80 }],
			},
		]);
	});

	it("a week metered for one model names the model", () => {
		expect(
			mapped({
				rateLimitType: "seven_day_opus",
				status: "allowed",
				utilization: 0.415,
			}),
		).toMatchObject([
			{
				status: "allowed",
				windows: [{ durationMinutes: 10080, model: "opus", usedPercent: 42 }],
			},
		]);
	});

	it("overage is a share with no window; a rejection with no share is a verdict alone", () => {
		expect(mapped({ rateLimitType: "overage", status: "allowed", utilization: 0.1 })).toMatchObject([{ windows: [{ usedPercent: 10 }] }]);
		expect(mapped({ status: "rejected" })).toMatchObject([{ status: "rejected", type: "rate.limit", windows: [] }]);
	});
});
