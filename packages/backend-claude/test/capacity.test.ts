import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { type BackendCapacityController, makeBackendCapacityController } from "@antumbra/plugin-api";
import { it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { describe, expect } from "vitest";
import { InputQueue } from "#adapters/input-queue.ts";
import { consumeSdkMessages } from "#adapters/session.ts";
import { classifyClaudeCapacity } from "#capacity.ts";
import { openSessionMapping } from "#mapping.ts";
import { rawOf } from "#raw-payload.ts";

const SESSION = "57723c86-0b0c-4db1-9c79-1ae37fc5ef4a";
const RESET_SECONDS = 1_788_042_600;

type RateLimitFrame = Extract<SDKMessage, { type: "rate_limit_event" }>;

const rateLimit = (
	status: RateLimitFrame["rate_limit_info"]["status"],
	overrides: Partial<RateLimitFrame["rate_limit_info"]> = {},
): RateLimitFrame => ({
	rate_limit_info: {
		rateLimitType: "five_hour",
		resetsAt: RESET_SECONDS,
		status,
		utilization: 0.94,
		...overrides,
	},
	session_id: SESSION,
	type: "rate_limit_event",
	uuid: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
});

const apiRetry: SDKMessage = {
	attempt: 1,
	error: "rate_limit",
	error_status: 429,
	max_retries: 3,
	retry_delay_ms: 1_000,
	session_id: SESSION,
	subtype: "api_retry",
	type: "system",
	uuid: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
};

const recordCapacityObservedFrame = (delivered: SDKMessage[], frame: SDKMessage, observations: number) => {
	delivered.push(frame);
	expect(openSessionMapping().frame(frame)[0]?.raw).toEqual(rawOf(frame));
	expect(observations).toBe(delivered.length);
};

describe("claude capacity evidence", () => {
	it("blocks a rejected usage window and converts its reset to milliseconds", () => {
		const rejected = rateLimit("rejected", { utilization: 1 });
		const raw = rawOf(rejected);

		expect(Option.getOrThrow(classifyClaudeCapacity(raw))).toEqual({
			detail: "Claude five-hour usage limit reached",
			reason: "usage-limit",
			resetsAt: RESET_SECONDS * 1_000,
			status: "blocked",
			utilization: 1,
		});
		expect(openSessionMapping().frame(rejected)).toMatchObject([
			{
				raw: {
					kind: "rate_limit_event",
					payload: raw.payload,
					source: "claude",
				},
				type: "raw",
			},
		]);
	});

	it("makes an approaching usage window visible as a warning", () => {
		expect(Option.getOrThrow(classifyClaudeCapacity(rawOf(rateLimit("allowed_warning"))))).toEqual({
			detail: "Claude five-hour usage is approaching its limit",
			reason: "usage-limit",
			resetsAt: RESET_SECONDS * 1_000,
			status: "warning",
			utilization: 0.94,
		});
	});

	it("publishes an allowed reading as available", () => {
		expect(Option.getOrThrow(classifyClaudeCapacity(rawOf(rateLimit("allowed"))))).toEqual({ status: "available" });
	});

	it("leaves provider-managed API retries unclassified", () => {
		expect(Option.isNone(classifyClaudeCapacity(rawOf(apiRetry)))).toBe(true);
		expect(openSessionMapping().frame(apiRetry)).toMatchObject([{ raw: { kind: "system/api_retry", source: "claude" }, type: "raw" }]);
	});

	it.effect("feeds every live SDK frame to capacity exactly once", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const controller = yield* makeBackendCapacityController(classifyClaudeCapacity);
				let observations = 0;
				const counting: BackendCapacityController = {
					observe: (raw, observedAt) => {
						observations += 1;
						return controller.observe(raw, observedAt);
					},
					source: controller.source,
				};
				const rejected = rateLimit("rejected", { utilization: 1 });
				const delivered: SDKMessage[] = [];
				const input = new InputQueue(() => {});
				const frames = [rejected, apiRetry];
				const live: AsyncIterable<SDKMessage> = {
					[Symbol.asyncIterator]: () => {
						const iterator = frames[Symbol.iterator]();
						return { next: () => Promise.resolve(iterator.next()) };
					},
				};

				yield* Effect.promise(() =>
					consumeSdkMessages(live, input, (frame) => recordCapacityObservedFrame(delivered, frame, observations), counting.observe),
				);
				expect(delivered).toEqual(frames);
				expect(observations).toBe(2);
				expect(Option.getOrThrow(yield* controller.source.current)).toMatchObject({
					observedAt: expect.any(Number),
					reason: "usage-limit",
					status: "blocked",
				});
			}),
		),
	);
});
