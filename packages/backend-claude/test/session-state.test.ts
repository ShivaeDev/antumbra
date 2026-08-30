import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { describe, expect, it } from "vitest";
import { openSessionMapping } from "#mapping.ts";

// why: fixtures are the SDK's own shapes for the pinned version — the whole
// point of these frames is that the harness already says what the session is
// doing, so the fields are written out as it sends them rather than trimmed to
// the ones the mapping happens to read today.
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

const usageOf = (input: number, cacheRead: number, cacheWrite: number, output: number): ResultMessage["usage"] => ({
	cache_creation: {
		ephemeral_1h_input_tokens: 0,
		ephemeral_5m_input_tokens: cacheWrite,
	},
	cache_creation_input_tokens: cacheWrite,
	cache_read_input_tokens: cacheRead,
	fallback_credit: { status: { reason: "not_enabled", type: "not_applied" } },
	inference_geo: "us",
	input_tokens: input,
	iterations: [],
	output_tokens: output,
	output_tokens_details: { thinking_tokens: 0 },
	server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
	service_tier: "standard",
	speed: "standard",
});

const result = (totalCostUsd: number, usage: ResultMessage["usage"], models: ReadonlyArray<string> = ["claude-opus-5"]): SDKMessage => ({
	duration_api_ms: 9000,
	duration_ms: 12300,
	is_error: false,
	modelUsage: Object.fromEntries(
		models.map((model) => [
			model,
			{
				cacheCreationInputTokens: usage.cache_creation_input_tokens,
				cacheReadInputTokens: usage.cache_read_input_tokens,
				contextWindow: 200000,
				costUSD: totalCostUsd,
				inputTokens: usage.input_tokens,
				maxOutputTokens: 64000,
				outputTokens: usage.output_tokens,
				webSearchRequests: 0,
			},
		]),
	),
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

	it("splits a turn's tokens four ways and names the model that answered", () => {
		const mapping = openSessionMapping();
		const [usage] = mapping.frame(result(0.0412, usageOf(1500, 4820, 12100, 730)));
		expect(usage).toEqual({
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

	// why: total_cost_usd is the running total for the whole query, so the second
	// turn of a session must report its own step and not the session's spend —
	// which is exactly what this record used to show on every turn.
	it("reports the turn's own cost as the step from the running total", () => {
		const mapping = openSessionMapping();
		mapping.frame(result(0.0412, usageOf(1500, 4820, 12100, 730)));
		const [second] = mapping.frame(result(0.06, usageOf(1410, 96240, 0, 210)));
		expect(second).toMatchObject({
			cacheReadTokens: 96240,
			cumulativeCostUsd: 0.06,
			inputTokens: 1410,
		});
		expect(second).toHaveProperty("costUsd", expect.closeTo(0.0188, 6));
	});

	// why: the SDK resets the running total when a session is resumed or cleared,
	// so a total that came back smaller is a reset and the total is the step. A
	// turn that earned money would be worse than one that spent the lot again.
	it("reads a total that went backwards as the counter starting over", () => {
		const mapping = openSessionMapping();
		mapping.frame(result(0.5, usageOf(1500, 4820, 12100, 730)));
		const [after] = mapping.frame(result(0.02, usageOf(1410, 96240, 0, 210)));
		expect(after).toMatchObject({ costUsd: 0.02, cumulativeCostUsd: 0.02 });
	});

	// why: modelUsage is keyed by every model the query pipeline called, and a
	// turn several of them answered has no one model to name.
	it("names no model when more than one answered", () => {
		const mapping = openSessionMapping();
		const [usage] = mapping.frame(result(0.01, usageOf(10, 0, 0, 2), ["claude-opus-5", "claude-haiku-5"]));
		expect(usage).not.toHaveProperty("model");
	});
});
