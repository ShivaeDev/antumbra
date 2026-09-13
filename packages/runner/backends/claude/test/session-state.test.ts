import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { describe, expect, it } from "vitest";
import { openSessionMapping } from "#mapping.ts";

const SESSION = "57723c86-0b0c-4db1-9c79-1ae37fc5ef4a";
const SESSION_MODEL = "claude-sonnet-5";

const stateFrame = (state: "idle" | "requires_action" | "running"): SDKMessage => ({
	session_id: SESSION,
	state,
	subtype: "session_state_changed",
	type: "system",
	uuid: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
});

const tasksFrame = (
	tasks: ReadonlyArray<{
		description: string;
		task_id: string;
		task_type: string;
	}>,
): SDKMessage => ({
	session_id: SESSION,
	subtype: "background_tasks_changed",
	tasks: [...tasks],
	type: "system",
	uuid: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
});

type ResultMessage = Extract<SDKMessage, { type: "result" }>;

const usage: ResultMessage["usage"] = {
	cache_creation: {
		ephemeral_1h_input_tokens: 0,
		ephemeral_5m_input_tokens: 12100,
	},
	cache_creation_input_tokens: 12100,
	cache_read_input_tokens: 4820,
	fallback_credit: { status: { reason: "not_enabled", type: "not_applied" } },
	inference_geo: "us",
	input_tokens: 1500,
	iterations: [],
	output_tokens: 730,
	output_tokens_details: { thinking_tokens: 0 },
	server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
	service_tier: "standard",
	speed: "standard",
};

interface Spent {
	readonly canonical?: string;
	readonly model: string;
	readonly totalTokens: number;
}

const OPUS: ReadonlyArray<Spent> = [{ model: "claude-opus-5", totalTokens: 19150 }];

const modelUsage = (spent: ReadonlyArray<Spent>) =>
	Object.fromEntries(
		spent.map((entry) => [
			entry.model,
			{
				cacheCreationInputTokens: 0,
				cacheReadInputTokens: 0,
				...(entry.canonical === undefined ? {} : { canonicalModel: entry.canonical }),
				contextWindow: 200000,
				costUSD: 0,
				inputTokens: entry.totalTokens,
				maxOutputTokens: 64000,
				outputTokens: 0,
				webSearchRequests: 0,
			},
		]),
	);

const result = (totalCostUsd: number, spent: ReadonlyArray<Spent> = OPUS): SDKMessage => ({
	duration_api_ms: 9000,
	duration_ms: 12300,
	is_error: false,
	modelUsage: modelUsage(spent),
	num_turns: 1,
	permission_denials: [],
	result: "done",
	session_id: SESSION,
	stop_reason: "end_turn",
	subtype: "success",
	total_cost_usd: totalCostUsd,
	type: "result",
	usage,
	uuid: "3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f",
});

describe("the harness's own account of a session is kept", () => {
	it("keeps every state word, and calls requires_action awaiting input", () => {
		const mapping = openSessionMapping(SESSION_MODEL);
		expect(mapping.frame(stateFrame("running"))).toMatchObject([{ state: "running", type: "session.state" }]);
		expect(mapping.frame(stateFrame("requires_action"))).toMatchObject([{ state: "awaiting-input", type: "session.state" }]);
		expect(mapping.frame(stateFrame("idle"))).toMatchObject([{ raw: { kind: "system/session_state_changed" }, state: "idle" }]);
	});

	it("takes the whole background set, and an empty one as the answer it is", () => {
		const mapping = openSessionMapping(SESSION_MODEL);
		expect(
			mapping.frame(
				tasksFrame([
					{
						description: "pnpm ready",
						task_id: "bg-1",
						task_type: "shell",
					},
					{
						description: "Map the session cluster",
						task_id: "bg-2",
						task_type: "subagent",
					},
				]),
			),
		).toMatchObject([
			{
				tasks: [
					{ description: "pnpm ready", id: "bg-1", kind: "shell" },
					{
						description: "Map the session cluster",
						id: "bg-2",
						kind: "subagent",
					},
				],
				type: "session.background",
			},
		]);
		expect(mapping.frame(tasksFrame([]))).toMatchObject([{ tasks: [], type: "session.background" }]);
	});

	it("splits a turn's tokens four ways and names the model that answered", () => {
		const mapping = openSessionMapping(SESSION_MODEL);
		const [event] = mapping.frame(result(0.0412));
		expect(event).toEqual({
			cacheReadTokens: 4820,
			cacheWriteTokens: 12100,
			costUsd: 0.0412,
			cumulativeCostUsd: 0.0412,
			inputTokens: 1500,
			model: "claude-opus-5",
			outputTokens: 730,
			raw: expect.objectContaining({ kind: "result/success" }),
			type: "usage",
		});
	});

	it("reports the turn's own cost as the step from the running total", () => {
		const mapping = openSessionMapping(SESSION_MODEL);
		mapping.frame(result(0.0412));
		const [second] = mapping.frame(result(0.06));
		expect(second).toMatchObject({ cumulativeCostUsd: 0.06 });
		expect(second).toHaveProperty("costUsd", expect.closeTo(0.0188, 6));
	});

	it("reads a total that went backwards as the counter starting over", () => {
		const mapping = openSessionMapping(SESSION_MODEL);
		mapping.frame(result(0.5));
		const [after] = mapping.frame(result(0.02));
		expect(after).toMatchObject({ costUsd: 0.02, cumulativeCostUsd: 0.02 });
	});

	it("names the model that spent the most of the turn's own tokens", () => {
		const mapping = openSessionMapping(SESSION_MODEL);
		const [first] = mapping.frame(
			result(0.01, [
				{ model: "claude-opus-5", totalTokens: 19150 },
				{ model: "claude-haiku-5", totalTokens: 400 },
			]),
		);
		expect(first).toMatchObject({ model: "claude-opus-5" });
		const [second] = mapping.frame(
			result(0.02, [
				{ model: "claude-opus-5", totalTokens: 19150 },
				{ model: "claude-haiku-5", totalTokens: 1200 },
			]),
		);
		expect(second).toMatchObject({ model: "claude-haiku-5" });
	});

	it("names a model by the id the provider prices it under, not by the alias it was asked for", () => {
		const mapping = openSessionMapping(SESSION_MODEL);
		const [event] = mapping.frame(result(0.01, [{ canonical: "claude-opus-4-7", model: "opus", totalTokens: 19150 }]));
		expect(event).toMatchObject({ model: "claude-opus-4-7" });
	});

	it("names the model the session was started on when no model spent anything this turn", () => {
		const mapping = openSessionMapping(SESSION_MODEL);
		mapping.frame(result(0.01));
		const [second] = mapping.frame(result(0.02));
		expect(second).toMatchObject({ model: SESSION_MODEL });
	});
});
