import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

export const NATIVE_ROOT = "c1f4b2a0-8d3e-4f61-9a2b-7c5d6e4f3a21";

type Uuid = Extract<SDKMessage, { type: "result" }>["uuid"];
type Content = Extract<SDKMessage, { type: "assistant" }>["message"]["content"];
type ContentBlock = Content[number];

export const usage: Extract<SDKMessage, { type: "result" }>["usage"] = {
	cache_creation: {
		ephemeral_1h_input_tokens: 0,
		ephemeral_5m_input_tokens: 0,
	},
	cache_creation_input_tokens: 0,
	cache_read_input_tokens: 0,
	fallback_credit: { status: { reason: "not_enabled", type: "not_applied" } },
	inference_geo: "us",
	input_tokens: 1_204,
	iterations: [],
	output_tokens: 318,
	output_tokens_details: { thinking_tokens: 0 },
	server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
	service_tier: "standard",
	speed: "standard",
};

export const assistant = (content: Content, parent: string | null, uuid: Uuid): SDKMessage => ({
	message: {
		container: null,
		content,
		context_management: null,
		diagnostics: null,
		id: "msg_01RqvXbTgW6h9m2ZkNpLdYcF",
		model: "claude-opus-4-6",
		role: "assistant",
		stop_details: null,
		stop_reason: "tool_use",
		stop_sequence: null,
		type: "message",
		usage,
	},
	parent_tool_use_id: parent,
	session_id: NATIVE_ROOT,
	type: "assistant",
	uuid,
});

export const text = (body: string): ContentBlock => ({
	citations: null,
	text: body,
	type: "text",
});

export const toolUse = (id: string, name: string, input: Record<string, unknown>): ContentBlock => ({ id, input, name, type: "tool_use" });

export const initFrame: SDKMessage = {
	apiKeySource: "user",
	claude_code_version: "2.1.236",
	cwd: "/tmp/moorage",
	mcp_servers: [],
	model: "claude-opus-4-6",
	output_style: "default",
	permissionMode: "auto",
	plugins: [],
	session_id: NATIVE_ROOT,
	skills: [],
	slash_commands: [],
	subtype: "init",
	tools: ["Task", "Workflow"],
	type: "system",
	uuid: "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
};
