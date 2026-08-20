import type {
	SDKMessage,
	SessionKey,
	SessionStoreEntry,
} from "@anthropic-ai/claude-agent-sdk";
import { expect, it } from "@effect/vitest";
import { openSessionLanes } from "#session-lanes.ts";

const NATIVE_ROOT = "c1f4b2a0-8d3e-4f61-9a2b-7c5d6e4f3a21";
const CALL = "toolu_01WkF9pQ3rTvXn7mLbYcZd2E";
const AGENT = "3f9c1d2e4a5b6c70";

const key = (subpath?: string): SessionKey => ({
	projectKey: "-tmp-moorage",
	sessionId: NATIVE_ROOT,
	...(subpath === undefined ? {} : { subpath }),
});

const line = (
	type: string,
	content: ReadonlyArray<Record<string, unknown>>,
): SessionStoreEntry => ({
	message: { content, role: type },
	timestamp: "2026-08-20T09:14:03.117Z",
	type,
	uuid: "6f7a8b9c-0d1e-4f2a-9b3c-5d6e7f809102",
});

// why: the snapshot naming a workflow's agents is not part of the published
// SDK type, and the fixture says so rather than pretending otherwise.
type ProgressFrame = Extract<SDKMessage, { subtype: "task_progress" }> & {
	readonly workflow_progress: ReadonlyArray<unknown>;
};

const progress = (state: string, label: string): ProgressFrame => ({
	description: "audit",
	session_id: NATIVE_ROOT,
	subtype: "task_progress",
	task_id: "task_audit",
	tool_use_id: CALL,
	type: "system",
	usage: { duration_ms: 1, tool_uses: 1, total_tokens: 1 },
	uuid: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c50",
	workflow_progress: [
		{ agentId: AGENT, label, model: "opus", state, type: "workflow_agent" },
	],
});

const agentKey = key(`subagents/workflows/wfr_7f3a2b1c/agent-${AGENT}`);

// why: the transcript of an agent the stream already carried is mirrored too,
// and reading it as if it were new would write every word of that agent's work
// into the log a second time.
it("a transcript the stream already carried is read only for what it drops", () => {
	const lanes = openSessionLanes();
	const spoken = lanes.mirror({
		entries: [line("assistant", [{ text: "thinking", type: "text" }])],
		key: key(),
	});
	expect(spoken).toEqual([]);
	lanes.mirror({
		entries: [
			line("assistant", [
				{ id: CALL, input: {}, name: "Workflow", type: "tool_use" },
			]),
		],
		key: key(),
	});
	const answered = lanes.mirror({
		entries: [
			line("user", [
				{ content: "audited", tool_use_id: CALL, type: "tool_result" },
			]),
		],
		key: key(),
	});
	expect(answered).toMatchObject([
		{ ok: true, output: "audited", toolId: CALL, type: "tool.completed" },
	]);
});

// why: a name that arrives after the agent has already spoken fills the hole
// the opening left. The node is never announced twice, and the words that
// arrived first are never held back waiting for it.
it("an agent that spoke before it was named is named afterwards", () => {
	const lanes = openSessionLanes();
	const first = lanes.mirror({
		entries: [line("assistant", [{ text: "reading", type: "text" }])],
		key: agentKey,
	});
	expect(first).toMatchObject([
		{ subsessionRef: AGENT, type: "subsession.opened" },
		{ role: "agent", text: "reading", type: "message" },
	]);
	expect(first[0]).not.toHaveProperty("label");
	expect(lanes.frame(progress("running", "read the ledger"))).toEqual([]);
	expect(
		lanes.mirror({
			entries: [line("assistant", [{ text: "read", type: "text" }])],
			key: agentKey,
		}),
	).toMatchObject([
		{ label: "read the ledger", subsessionRef: AGENT },
		{ text: "read", type: "message" },
	]);
	expect(lanes.frame(progress("done", "read the ledger"))).toMatchObject([
		{ outcome: "completed", subsessionRef: AGENT, type: "subsession.ended" },
	]);
});
