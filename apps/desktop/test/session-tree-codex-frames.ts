import type { RpcNotification } from "@antumbra/backend-codex";

export const ROOT_THREAD = "019ff334-ec21-7373-a31e-e8a0db309020";
export const BRANCH_THREAD = "019ff400-1111-7373-a31e-e8a0db309021";
export const LEAF_THREAD = "019ff400-2222-7373-a31e-e8a0db309022";
export const STRAY_THREAD = "019ff400-4444-7373-a31e-e8a0db309024";
export const GUARDIAN_THREAD = "019ff400-3333-7373-a31e-e8a0db309023";
export const BRANCH_AGENT = ".codex/agents/auditor.md";
export const LEAF_AGENT = ".codex/agents/scribe.md";
export const SPAWN_CALL = "collab_2";
const TURN = "019ff334-ed58-7ff3-8dfb-1ceb96c93ccd";

const item = (method: string, threadId: string, payload: Record<string, unknown>): RpcNotification => ({
	method,
	params: { completedAtMs: 1, item: payload, threadId, turnId: TURN },
});

const said = (threadId: string, id: string, text: string): RpcNotification => item("item/completed", threadId, { id, text, type: "agentMessage" });

const spawnedThread = (id: string, parent: string): RpcNotification => ({
	method: "thread/started",
	params: {
		thread: {
			cwd: "/moorage",
			id,
			source: {
				subAgent: { thread_spawn: { depth: 1, parent_thread_id: parent } },
			},
		},
	},
});

const reviewerThread = (id: string): RpcNotification => ({
	method: "thread/started",
	params: {
		thread: {
			cwd: "/moorage",
			id,
			parentThreadId: ROOT_THREAD,
			source: { subAgent: "review" },
		},
	},
});

const announces = (threadId: string, agentThreadId: string, agentPath: string, id: string, kind = "started"): RpcNotification =>
	item("item/started", threadId, {
		agentPath,
		agentThreadId,
		id,
		kind,
		type: "subAgentActivity",
	});

const spawnCall = (threadId: string, receiver: string): RpcNotification =>
	item("item/started", threadId, {
		agentsStates: {},
		id: SPAWN_CALL,
		prompt: "chart what drifted",
		receiverThreadIds: [receiver],
		senderThreadId: threadId,
		status: "inProgress",
		tool: "spawnAgent",
		type: "collabAgentToolCall",
	});

const verdict = (threadId: string): RpcNotification => ({
	method: "item/autoApprovalReview/completed",
	params: {
		action: {
			command: "rm -rf /moorage",
			cwd: "/moorage",
			source: "shell",
			type: "command",
		},
		completedAtMs: 2,
		decisionSource: "agent",
		review: {
			rationale: "irreversible deletion of the workspace",
			riskLevel: "critical",
			status: "denied",
		},
		reviewId: "review_1",
		startedAtMs: 1,
		threadId,
		turnId: TURN,
	},
});

export const codexRehearsal: ReadonlyArray<RpcNotification> = [
	spawnedThread(BRANCH_THREAD, ROOT_THREAD),
	said(BRANCH_THREAD, "msg_1", "the ledger reads clean"),
	spawnedThread(LEAF_THREAD, BRANCH_THREAD),
	said(LEAF_THREAD, "msg_2", "two entries drifted"),
	spawnedThread(STRAY_THREAD, BRANCH_THREAD),
	said(STRAY_THREAD, "msg_3", "still counting"),
	announces(ROOT_THREAD, BRANCH_THREAD, BRANCH_AGENT, "sub_1"),
	spawnCall(BRANCH_THREAD, LEAF_THREAD),
	announces(BRANCH_THREAD, LEAF_THREAD, LEAF_AGENT, "sub_2"),
	reviewerThread(GUARDIAN_THREAD),
	said(GUARDIAN_THREAD, "msg_4", "this looks destructive"),
	verdict(BRANCH_THREAD),
	{
		method: "thread/tokenUsage/updated",
		params: {
			threadId: BRANCH_THREAD,
			tokenUsage: {
				last: {
					cacheWriteInputTokens: 128,
					cachedInputTokens: 640,
					inputTokens: 812,
					outputTokens: 96,
					reasoningOutputTokens: 12,
					totalTokens: 1548,
				},
				total: {
					cacheWriteInputTokens: 512,
					cachedInputTokens: 3200,
					inputTokens: 4812,
					outputTokens: 640,
					reasoningOutputTokens: 64,
					totalTokens: 8524,
				},
			},
			turnId: TURN,
		},
	},
	announces(BRANCH_THREAD, LEAF_THREAD, LEAF_AGENT, "sub_3", "interrupted"),
	{ method: "thread/closed", params: { threadId: BRANCH_THREAD } },
	said(ROOT_THREAD, "msg_5", "the audit is done"),
];
