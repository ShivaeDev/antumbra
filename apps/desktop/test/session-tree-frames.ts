import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Delivery } from "@antumbra/backend-claude";
import { assistant, initFrame, NATIVE_ROOT, text, toolUse, usage } from "#test/session-frames.ts";

export { NATIVE_ROOT } from "#test/session-frames.ts";

export const AGENT_CALL = "toolu_01Q8vJ7Xr2mNbK4pLcTfYh3W";
export const SUBSESSION = "a2b8c2a1b3d038e69";
export const NESTED_CALL = "toolu_01Zt6RmP9wQxL3sVdNfKe8Ay";
export const NESTED_SUBSESSION = "d4e5f6a7b8c9d0e1f";

const task = (id: string, description: string) => toolUse(id, "Task", { description, subagent_type: "Explore" });

const delegating = assistant([task(AGENT_CALL, "Map the session execution cluster")], null, "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e");

const started: SDKMessage = {
	description: "Map the session execution cluster",
	prompt: "Read the session cluster and report what each file means",
	session_id: NATIVE_ROOT,
	subagent_type: "Explore",
	subtype: "task_started",
	task_id: SUBSESSION,
	task_type: "local_agent",
	tool_use_id: AGENT_CALL,
	type: "system",
	uuid: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
};

const working = assistant([text("reading the cluster")], AGENT_CALL, "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f70");

const delegatingAgain = assistant([task(NESTED_CALL, "Read the recovery guide")], AGENT_CALL, "4e5f6a7b-8c9d-4e0f-9a1b-3c4d5e6f7081");

const nestedStarted: SDKMessage = {
	description: "Read the recovery guide",
	session_id: NATIVE_ROOT,
	subagent_type: "Explore",
	subtype: "task_started",
	task_id: NESTED_SUBSESSION,
	task_type: "local_agent",
	tool_use_id: NESTED_CALL,
	type: "system",
	uuid: "5f6a7b8c-9d0e-4f1a-8b2c-4d5e6f708192",
};

// why: a backgrounded spawn keeps talking after the turn that started it ends,
// so the frames that follow this one are the case the acquisition path exists
// for: result is a turn boundary, never the end of the session.
const turnEnded: SDKMessage = {
	duration_api_ms: 41_204,
	duration_ms: 42_318,
	is_error: false,
	modelUsage: {},
	num_turns: 1,
	permission_denials: [],
	result: "delegated",
	session_id: NATIVE_ROOT,
	stop_reason: "end_turn",
	subtype: "success",
	total_cost_usd: 0.42,
	type: "result",
	usage,
	uuid: "6a7b8c9d-0e1f-4a2b-9c3d-5e6f70819203",
};

const reporting = assistant([text("the cluster maps cleanly")], AGENT_CALL, "7b8c9d0e-1f2a-4b3c-8d4e-6f7081920314");

const completed: SDKMessage = {
	patch: { end_time: 1_787_180_346_207, status: "completed" },
	session_id: NATIVE_ROOT,
	subtype: "task_updated",
	task_id: SUBSESSION,
	type: "system",
	uuid: "8c9d0e1f-2a3b-4c4d-9e5f-708192031425",
};

const notified: SDKMessage = {
	output_file: `/tmp/tasks/${SUBSESSION}.output`,
	session_id: NATIVE_ROOT,
	status: "completed",
	subtype: "task_notification",
	summary: "the cluster maps cleanly",
	task_id: SUBSESSION,
	tool_use_id: AGENT_CALL,
	type: "system",
	usage: { duration_ms: 288_529, tool_uses: 43, total_tokens: 75_383 },
	uuid: "9d0e1f2a-3b4c-4d5e-8f60-819203142536",
};

// why: one delegated agent that finishes and one it spawned that never does.
// The second is how the record is held to saying where it stopped seeing:
// the stream ends with that node still open and nothing to close it.
const rehearsalFrames: ReadonlyArray<SDKMessage> = [
	initFrame,
	delegating,
	started,
	working,
	delegatingAgain,
	nestedStarted,
	turnEnded,
	reporting,
	completed,
	notified,
];

export const streamRehearsal: ReadonlyArray<Delivery> = rehearsalFrames.map((message) => ({ kind: "frame", message }));
