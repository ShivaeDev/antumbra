import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { InputQueue } from "#adapters/input-queue.ts";
import { consumeSdkMessages } from "#adapters/session.ts";

const ended = (frame: string): SDKMessage => ({
	patch: { status: "completed" },
	session_id: "16a1f0a2-4f6e-4c2f-9a83-0c1f6d2e5b74",
	subtype: "task_updated",
	task_id: frame,
	type: "system",
	uuid: "b4c2a0d8-6e3f-4a51-8b29-7d5c6e4f3a20",
});

const turnEnd: SDKMessage = {
	duration_api_ms: 12,
	duration_ms: 14,
	is_error: false,
	modelUsage: {},
	num_turns: 1,
	permission_denials: [],
	result: "delegated",
	session_id: "16a1f0a2-4f6e-4c2f-9a83-0c1f6d2e5b74",
	stop_reason: "end_turn",
	subtype: "success",
	total_cost_usd: 0.01,
	type: "result",
	usage: {
		cache_creation: {
			ephemeral_1h_input_tokens: 0,
			ephemeral_5m_input_tokens: 0,
		},
		cache_creation_input_tokens: 0,
		cache_read_input_tokens: 0,
		fallback_credit: { status: { reason: "not_enabled", type: "not_applied" } },
		inference_geo: "us",
		input_tokens: 12,
		iterations: [],
		output_tokens: 3,
		output_tokens_details: { thinking_tokens: 0 },
		server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
		service_tier: "standard",
		speed: "standard",
	},
	uuid: "c5d3b1e9-7f40-4b62-9c3a-8e6d7f504b31",
};

const script: ReadonlyArray<SDKMessage> = [ended("before"), turnEnd, ended("after")];

// why: result is a turn boundary, not a session boundary. Backgrounded work is
// the production default and reports itself after the turn that started it has
// already ended, so a loop that stopped on result would lose every ending.
it.effect("the stream is consumed past the turn that ended", () =>
	Effect.gen(function* () {
		const delivered: SDKMessage[] = [];
		const input = new InputQueue(() => {});
		const live: AsyncIterable<SDKMessage> = {
			[Symbol.asyncIterator]: () => {
				const frames = script[Symbol.iterator]();
				return {
					next: () => Promise.resolve(frames.next()),
				};
			},
		};
		yield* Effect.promise(() =>
			consumeSdkMessages(live, input, (frame) => {
				delivered.push(frame);
			}),
		);
		expect(delivered).toEqual(script);
	}),
);
