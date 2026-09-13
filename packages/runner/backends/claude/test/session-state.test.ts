import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { describe, expect, it } from "vitest";
import { openSessionMapping } from "#mapping.ts";

const SESSION = "57723c86-0b0c-4db1-9c79-1ae37fc5ef4a";

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

// Every number a result reports for a model is the running total for the query so far.
interface Spent {
	readonly cacheRead?: number;
	readonly cacheWrite?: number;
	readonly canonical?: string;
	readonly cost?: number;
	readonly input?: number;
	readonly model: string;
	readonly output?: number;
}

const OPUS: ReadonlyArray<Spent> = [{ cacheRead: 4820, cacheWrite: 12100, cost: 0.0412, input: 1500, model: "claude-opus-5", output: 730 }];

const modelUsage = (spent: ReadonlyArray<Spent>) =>
	Object.fromEntries(
		spent.map((entry) => [
			entry.model,
			{
				cacheCreationInputTokens: entry.cacheWrite ?? 0,
				cacheReadInputTokens: entry.cacheRead ?? 0,
				...(entry.canonical === undefined ? {} : { canonicalModel: entry.canonical }),
				contextWindow: 200000,
				costUSD: entry.cost ?? 0,
				inputTokens: entry.input ?? 0,
				maxOutputTokens: 64000,
				outputTokens: entry.output ?? 0,
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
		const mapping = openSessionMapping();
		expect(mapping.frame(stateFrame("running"))).toMatchObject([{ state: "running", type: "session.state" }]);
		expect(mapping.frame(stateFrame("requires_action"))).toMatchObject([{ state: "awaiting-input", type: "session.state" }]);
		expect(mapping.frame(stateFrame("idle"))).toMatchObject([{ raw: { kind: "system/session_state_changed" }, state: "idle" }]);
	});

	it("takes the whole background set, and an empty one as the answer it is", () => {
		const mapping = openSessionMapping();
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

	it("splits a turn's tokens four ways under the model that spent them", () => {
		const mapping = openSessionMapping();
		const [event] = mapping.frame(result(0.0412));
		expect(event).toEqual({
			byModel: [{ cacheReadTokens: 4820, cacheWriteTokens: 12100, costUsd: 0.0412, inputTokens: 1500, model: "claude-opus-5", outputTokens: 730 }],
			cacheReadTokens: 4820,
			cacheWriteTokens: 12100,
			costUsd: 0.0412,
			cumulativeCostUsd: 0.0412,
			inputTokens: 1500,
			outputTokens: 730,
			raw: expect.objectContaining({ kind: "result/success" }),
			type: "usage",
		});
	});

	it("reports a model's own cost as the step from its running total", () => {
		const mapping = openSessionMapping();
		mapping.frame(result(0.0412));
		const [second] = mapping.frame(
			result(0.06, [{ cacheRead: 4820, cacheWrite: 12100, cost: 0.06, input: 1900, model: "claude-opus-5", output: 730 }]),
		);
		expect(second).toMatchObject({ cumulativeCostUsd: 0.06, inputTokens: 400 });
		expect(second).toHaveProperty("costUsd", expect.closeTo(0.0188, 6));
	});

	it("reads a total that went backwards as the counter starting over", () => {
		const mapping = openSessionMapping();
		mapping.frame(result(0.5, [{ cost: 0.5, input: 9000, model: "claude-opus-5" }]));
		const [after] = mapping.frame(result(0.02, [{ cost: 0.02, input: 40, model: "claude-opus-5" }]));
		expect(after).toMatchObject({ costUsd: 0.02, cumulativeCostUsd: 0.02, inputTokens: 40 });
	});

	it("bills a turn that ran on two models to both, and totals what they spent", () => {
		const mapping = openSessionMapping();
		const [event] = mapping.frame(
			result(0.05, [
				{ cost: 0.04, input: 1500, model: "claude-opus-5", output: 700 },
				{ cost: 0.01, input: 400, model: "claude-haiku-5", output: 60 },
			]),
		);
		expect(event).toMatchObject({
			byModel: [
				{ costUsd: 0.04, inputTokens: 1500, model: "claude-opus-5", outputTokens: 700 },
				{ costUsd: 0.01, inputTokens: 400, model: "claude-haiku-5", outputTokens: 60 },
			],
			inputTokens: 1900,
			outputTokens: 760,
		});
		expect(event).toHaveProperty("costUsd", expect.closeTo(0.05, 6));
	});

	it("names a model by the id the provider prices it under, not by the alias it was asked for", () => {
		const mapping = openSessionMapping();
		const [event] = mapping.frame(result(0.01, [{ canonical: "claude-opus-4-7", cost: 0.01, input: 19150, model: "opus" }]));
		expect(event).toMatchObject({ byModel: [{ model: "claude-opus-4-7" }] });
	});

	it("names no model at all on a turn where none of them moved", () => {
		const mapping = openSessionMapping();
		mapping.frame(result(0.0412));
		const [second] = mapping.frame(result(0.0412));
		expect(second).toMatchObject({ byModel: [], costUsd: 0, cumulativeCostUsd: 0.0412, inputTokens: 0, outputTokens: 0 });
	});
});
