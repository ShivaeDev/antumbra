import type { SDKMessage, SessionMessage, SessionStoreEntry } from "@anthropic-ai/claude-agent-sdk";
import type { Delivery } from "@antumbra/backend-claude";
import { assistant, initFrame, NATIVE_ROOT, toolUse } from "#test/session-frames.ts";

export const WORKFLOW_CALL = "toolu_01WkF9pQ3rTvXn7mLbYcZd2E";
const RUN_ID = "wfr_7f3a2b1c";
export const AGENT_ONE = "3f9c1d2e4a5b6c70";
export const AGENT_TWO = "8d7e6f5a4b3c2d10";
export const AGENT_LATE = "b1c2d3e4f5a60718";
export const WORKFLOW_RESULT = "two drifts, both in the ledger";

const PROJECT = "-tmp-moorage";
const workflowCall = toolUse(WORKFLOW_CALL, "Workflow", {
	description: "audit the ledger",
	scriptPath: ".claude/workflows/audit.js",
});

const frame = (message: SDKMessage): Delivery => ({ kind: "frame", message });

const mirror = (subpath: string | undefined, entries: ReadonlyArray<SessionStoreEntry>): Delivery => ({
	kind: "mirror",
	write: {
		entries,
		key: {
			projectKey: PROJECT,
			sessionId: NATIVE_ROOT,
			...(subpath === undefined ? {} : { subpath }),
		},
	},
});

const agentSubpath = (agentId: string) => `subagents/workflows/${RUN_ID}/agent-${agentId}`;

const line = (type: string, uuid: string, message: Record<string, unknown>): SessionStoreEntry => ({
	message,
	parentUuid: null,
	sessionId: NATIVE_ROOT,
	timestamp: "2026-08-20T09:14:03.117Z",
	type,
	uuid,
	version: "2.1.236",
});

const said = (uuid: string, body: string): SessionStoreEntry =>
	line("assistant", uuid, {
		content: [{ text: body, type: "text" }],
		role: "assistant",
	});

const agentEntry = (agentId: string, label: string, state: string) => ({
	agentId,
	index: 0,
	label,
	lastProgressAt: 1_787_180_346_207,
	lastToolName: "Read",
	model: "claude-opus-4-6",
	phaseIndex: 0,
	phaseTitle: "Audit",
	promptPreview: `${label} and report what it says`,
	startedAt: 1_787_180_340_000,
	state,
	tokens: 4_812,
	toolCalls: 9,
	type: "workflow_agent",
});

// The provider adds workflow_progress to this frame beyond the SDK type.
type ProgressFrame = Extract<SDKMessage, { subtype: "task_progress" }> & {
	readonly workflow_progress: ReadonlyArray<unknown>;
};

const progress = (one: string, two: string): ProgressFrame => ({
	description: "audit the ledger",
	session_id: NATIVE_ROOT,
	subtype: "task_progress",
	task_id: "task_audit",
	tool_use_id: WORKFLOW_CALL,
	type: "system",
	usage: { duration_ms: 12_004, tool_uses: 18, total_tokens: 9_624 },
	uuid: `1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c${one === "start" ? "50" : "51"}`,
	workflow_progress: [agentEntry(AGENT_ONE, "read the ledger", one), agentEntry(AGENT_TWO, "chart the drifts", two)],
});

const workflowStarted: SDKMessage = {
	description: "audit the ledger",
	prompt: "audit the ledger and chart what drifted",
	session_id: NATIVE_ROOT,
	subtype: "task_started",
	task_id: "task_audit",
	task_type: "local_workflow",
	tool_use_id: WORKFLOW_CALL,
	type: "system",
	uuid: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e",
	workflow_name: "audit",
};

const calling = line("assistant", "3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f", {
	content: [workflowCall],
	role: "assistant",
});

const returned = line("user", "4d5e6f7a-8b9c-4d0e-9f1a-3b4c5d6e7f80", {
	content: [
		{
			content: [{ text: WORKFLOW_RESULT, type: "text" }],
			tool_use_id: WORKFLOW_CALL,
			type: "tool_result",
		},
	],
	role: "user",
});

const adopted = (uuid: string, body: string): SessionMessage => ({
	message: { content: [{ text: body, type: "text" }], role: "assistant" },
	parent_agent_id: null,
	parent_tool_use_id: WORKFLOW_CALL,
	session_id: NATIVE_ROOT,
	type: "assistant",
	uuid,
});

export const workflowRehearsal: ReadonlyArray<Delivery> = [
	frame(initFrame),
	frame(assistant([workflowCall], null, "5e6f7a8b-9c0d-4e1f-8a2b-4c5d6e7f8091")),
	frame(workflowStarted),
	mirror(undefined, [calling]),
	frame(progress("start", "start")),
	mirror(agentSubpath(AGENT_ONE), [said("6f7a8b9c-0d1e-4f2a-9b3c-5d6e7f809102", "the ledger reads clean")]),
	mirror(agentSubpath(AGENT_TWO), [said("7a8b9c0d-1e2f-4a3b-8c4d-6e7f80910213", "two entries drifted")]),
	frame(progress("done", "done")),
	mirror(undefined, [returned]),
	{
		kind: "repair",
		repair: {
			agents: [
				{
					agentId: AGENT_LATE,
					messages: [
						adopted("8b9c0d1e-2f3a-4b4c-9d5e-7f8091021324", "checking twice"),
						adopted("9c0d1e2f-3a4b-4c5d-8e6f-8091021324a5", "the second is real"),
					],
				},
			],
			failure: undefined,
		},
	},
];
