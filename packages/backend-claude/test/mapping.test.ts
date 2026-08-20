import type {
	SDKMessage,
	SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { describe, expect, it } from "vitest";
import { openSessionMapping } from "#mapping.ts";

// why: fixtures are real captures from a live session (claude-code 2.1.236),
// trimmed to the fields that matter — the mapping is pinned to what the binary
// actually says, not to the schema's idea of it.
const SESSION = "57723c86-0b0c-4db1-9c79-1ae37fc5ef4a";
const AGENT_CALL = "toolu_01FXPFYypQqTefL5KPsKV8ww";
const SUBSESSION = "a2b8c2a1b3d038e69";

const started: SDKMessage = {
	description: "Map session execution cluster",
	prompt: "Read the domain session cluster and report what each file means",
	session_id: SESSION,
	subagent_type: "Explore",
	subtype: "task_started",
	task_id: SUBSESSION,
	task_type: "local_agent",
	tool_use_id: AGENT_CALL,
	type: "system",
	uuid: "9d0d0c62-05de-45b7-9a34-a0f3b1f4b4dd",
};

const bashStarted: SDKMessage = {
	description: "Install workspace dependencies",
	session_id: SESSION,
	subtype: "task_started",
	task_id: "b7eseofo8",
	task_type: "local_bash",
	tool_use_id: "toolu_016nLLGHj5p7pmyJYtLPU388",
	type: "system",
	uuid: "8500b49f-3cf4-4f15-9273-644688e1c207",
};

const updated = (taskId: string): SDKMessage => ({
	patch: { end_time: 1787180346207, status: "completed" },
	session_id: SESSION,
	subtype: "task_updated",
	task_id: taskId,
	type: "system",
	uuid: "c83158c1-38ad-4b69-b2f5-021106a5968b",
});

const notified: SDKMessage = {
	output_file: `/private/tmp/claude-501/${SESSION}/tasks/${SUBSESSION}.output`,
	session_id: SESSION,
	status: "completed",
	subtype: "task_notification",
	summary: "# Session execution cluster",
	task_id: SUBSESSION,
	tool_use_id: AGENT_CALL,
	type: "system",
	usage: { duration_ms: 288529, tool_uses: 43, total_tokens: 75383 },
	uuid: "1f0e1d9c-2b3a-4c5d-8e9f-0a1b2c3d4e5f",
};

const toolResult = (parent: string | null): SDKUserMessage => ({
	message: {
		content: [
			{ content: "sounded", tool_use_id: "toolu_09", type: "tool_result" },
		],
		role: "user",
	},
	parent_tool_use_id: parent,
	type: "user",
});

const agentReport: SDKUserMessage = {
	message: {
		content: [
			{
				content: "the cluster maps cleanly",
				tool_use_id: AGENT_CALL,
				type: "tool_result",
			},
		],
		role: "user",
	},
	parent_tool_use_id: null,
	tool_use_result: {
		agentId: SUBSESSION,
		agentType: "Explore",
		content: [{ text: "the cluster maps cleanly", type: "text" }],
		status: "completed",
		totalDurationMs: 288529,
		totalToolUseCount: 43,
		totalTokens: 75383,
	},
	type: "user",
};

describe("claude frames map onto the neutral vocabulary", () => {
	it("attributes a frame to the tool call that spawned it, or to no one", () => {
		const mapping = openSessionMapping();
		expect(mapping(toolResult(null))).toMatchObject([
			{ ok: true, toolId: "toolu_09", type: "tool.completed" },
		]);
		expect(mapping(toolResult(null))[0]).not.toHaveProperty("origin");
		expect(mapping(toolResult(AGENT_CALL))).toMatchObject([
			{ origin: { spawnedBy: AGENT_CALL }, type: "tool.completed" },
		]);
	});

	// why: parent_agent_id rides depth-2 frames on the wire but is absent from the
	// pinned SDK message types, so the fixture carries it the way the binary does.
	it("names the spawning node too when the spawner is itself a subsession", () => {
		const nested = { ...toolResult(AGENT_CALL), parent_agent_id: SUBSESSION };
		const [event] = openSessionMapping()(nested);
		expect(event).toMatchObject({
			origin: { parentNode: SUBSESSION, spawnedBy: AGENT_CALL },
			type: "tool.completed",
		});
	});

	it("opens a subsession for a delegated agent, never for a shell command", () => {
		const mapping = openSessionMapping();
		expect(mapping(started)).toEqual([
			{
				charter:
					"Read the domain session cluster and report what each file means",
				kind: "Explore",
				label: "Map session execution cluster",
				raw: {
					kind: "system/task_started",
					payload: JSON.stringify(started),
					source: "claude",
				},
				spawnedBy: AGENT_CALL,
				subsessionRef: SUBSESSION,
				type: "subsession.opened",
			},
		]);
		expect(mapping(bashStarted)).toMatchObject([
			{ raw: { kind: "system/task_started" }, type: "raw" },
		]);
	});

	it("ends the subsession when its task is patched terminal", () => {
		const mapping = openSessionMapping();
		mapping(started);
		expect(mapping(updated(SUBSESSION))).toMatchObject([
			{
				status: "completed",
				subsessionRef: SUBSESSION,
				type: "subsession.ended",
			},
		]);
	});

	it("leaves a shell command's completion raw, and never ends a node twice", () => {
		const mapping = openSessionMapping();
		mapping(started);
		mapping(bashStarted);
		expect(mapping(updated("b7eseofo8"))).toMatchObject([
			{ raw: { kind: "system/task_updated" }, type: "raw" },
		]);
		expect(mapping(updated(SUBSESSION))).toMatchObject([
			{ type: "subsession.ended" },
		]);
		expect(mapping(notified)).toMatchObject([
			{ raw: { kind: "system/task_notification" }, type: "raw" },
		]);
	});

	// why: task_updated carries no run totals, so a task whose notification is the
	// first terminal frame is the one place the summary and usage reach the event.
	it("closes on the notification when no patch preceded it", () => {
		const mapping = openSessionMapping();
		mapping(started);
		expect(mapping(notified)).toMatchObject([
			{
				durationMs: 288529,
				status: "completed",
				subsessionRef: SUBSESSION,
				summary: "# Session execution cluster",
				tokens: 75383,
				type: "subsession.ended",
			},
		]);
	});

	it("reads the Agent tool's own result for the run's totals", () => {
		const mapping = openSessionMapping();
		mapping(started);
		expect(mapping(agentReport)).toMatchObject([
			{ ok: true, toolId: AGENT_CALL, type: "tool.completed" },
			{
				durationMs: 288529,
				status: "completed",
				subsessionRef: SUBSESSION,
				summary: "the cluster maps cleanly",
				tokens: 75383,
				type: "subsession.ended",
			},
		]);
	});
});
