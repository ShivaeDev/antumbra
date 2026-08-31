import { describe, expect, it } from "vitest";
import { toAgentEvents } from "#mapping.ts";

const THREAD = "019ff334-ec21-7373-a31e-e8a0db309020";
const TURN = "019ff334-ed58-7ff3-8dfb-1ceb96c93ccd";

const item = (method: string, payload: Record<string, unknown>) => ({
	method,
	params: { item: payload, threadId: THREAD, turnId: TURN },
});

describe("codex notifications map onto the neutral vocabulary", () => {
	it("agentMessage completes into an agent message; its start is silent", () => {
		const payload = {
			id: "msg_1",
			text: "pong",
			type: "agentMessage",
		};
		expect(toAgentEvents(item("item/started", payload))).toEqual([]);
		const [event] = toAgentEvents(item("item/completed", payload));
		expect(event).toMatchObject({
			role: "agent",
			text: "pong",
			type: "message",
		});
		expect(event?.raw).toMatchObject({
			kind: "item/completed",
			source: "codex",
		});
	});

	it("userMessage echoes back as a user message", () => {
		const payload = {
			clientId: null,
			content: [
				{
					text: "Reply with exactly one word: pong",
					type: "text",
				},
			],
			id: "u1",
			type: "userMessage",
		};
		expect(toAgentEvents(item("item/completed", payload))).toMatchObject([
			{
				role: "user",
				text: "Reply with exactly one word: pong",
				type: "message",
			},
		]);
	});

	it("reasoning with no visible text is silent; with text it is thinking", () => {
		const empty = { content: [], id: "rs_1", summary: [], type: "reasoning" };
		expect(toAgentEvents(item("item/completed", empty))).toEqual([]);
		const spoken = {
			content: [],
			id: "rs_2",
			summary: ["**Weighing**", "then"],
			type: "reasoning",
		};
		expect(toAgentEvents(item("item/completed", spoken))).toMatchObject([{ text: "**Weighing**\nthen", type: "thinking" }]);
	});

	it("commandExecution starts as a tool and completes with exit status", () => {
		const running = {
			aggregatedOutput: null,
			command: "/bin/zsh -lc 'sleep 90'",
			cwd: "/w",
			exitCode: null,
			id: "call_1",
			status: "inProgress",
			type: "commandExecution",
		};
		expect(toAgentEvents(item("item/started", running))).toMatchObject([
			{
				input: "/bin/zsh -lc 'sleep 90'",
				name: "commandExecution",
				toolId: "call_1",
				type: "tool.started",
			},
		]);
		const done = {
			...running,
			aggregatedOutput: "hi\n",
			exitCode: 0,
			status: "completed",
		};
		expect(toAgentEvents(item("item/completed", done))).toMatchObject([{ ok: true, output: "hi\n", toolId: "call_1", type: "tool.completed" }]);
		const declined = { ...running, status: "declined" };
		expect(toAgentEvents(item("item/completed", declined))).toMatchObject([{ ok: false, output: "", type: "tool.completed" }]);
	});

	it("fileChange and mcpToolCall are tools too", () => {
		const patch = {
			changes: [{ diff: "+hello", path: "out.txt" }],
			id: "fc_1",
			status: "inProgress",
			type: "fileChange",
		};
		expect(toAgentEvents(item("item/started", patch))).toMatchObject([{ input: "out.txt", name: "fileChange", type: "tool.started" }]);
		expect(toAgentEvents(item("item/completed", { ...patch, status: "completed" }))).toMatchObject([
			{ ok: true, output: "+hello", type: "tool.completed" },
		]);
		const mcp = {
			arguments: { q: 1 },
			error: null,
			id: "mcp_1",
			server: "srv",
			status: "inProgress",
			tool: "search",
			type: "mcpToolCall",
		};
		expect(toAgentEvents(item("item/started", mcp))).toMatchObject([
			{ input: '{"q":1}', name: "srv: search", providerName: "srv/search", type: "tool.started" },
		]);
		expect(toAgentEvents(item("item/completed", { ...mcp, error: { message: "boom" }, status: "failed" }))).toMatchObject([
			{ ok: false, output: '{"message":"boom"}', type: "tool.completed" },
		]);
	});

	it("a tool we served reads as a tool, named as the agent called it", () => {
		const running = {
			arguments: { body: "ok", title: "spike" },
			contentItems: null,
			id: "exec-6f4d21ae",
			status: "inProgress",
			success: null,
			tool: "land_report",
			type: "dynamicToolCall",
		};
		expect(toAgentEvents(item("item/started", running))).toMatchObject([
			{
				input: '{"body":"ok","title":"spike"}',
				name: "land_report",
				servedBy: "antumbra",
				toolId: "exec-6f4d21ae",
				type: "tool.started",
			},
		]);
		const landed = {
			...running,
			contentItems: [{ text: "report landed", type: "inputText" }],
			status: "completed",
			success: true,
		};
		expect(toAgentEvents(item("item/completed", landed))).toMatchObject([{ ok: true, output: "report landed", type: "tool.completed" }]);
		const refused = { ...landed, success: false };
		expect(toAgentEvents(item("item/completed", refused))).toMatchObject([{ ok: false, type: "tool.completed" }]);
	});

	it("an item kind outside the model is kept raw, never dropped", () => {
		const events = toAgentEvents(item("item/completed", { id: "s", type: "sleep", durationMs: 3 }));
		expect(events).toMatchObject([{ raw: { kind: "item/completed" }, type: "raw" }]);
	});

	it("everything else is raw under its method name", () => {
		const events = toAgentEvents({
			method: "thread/name/updated",
			params: { name: "sound the eastern shoal", threadId: THREAD },
		});
		expect(events).toMatchObject([{ raw: { kind: "thread/name/updated" }, type: "raw" }]);
	});
});
