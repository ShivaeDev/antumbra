import { resolve } from "node:path";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Option } from "effect";
import { TOOL_SERVER_NAME } from "#adapters/tool-server.ts";

export interface ToolAccess {
	readonly names: ReadonlyArray<string>;
	readonly server: McpServer;
}

export interface SessionShape {
	readonly cwd: string;
	readonly executable: string;
	readonly resume: string | undefined;
	readonly tools: Option.Option<ToolAccess>;
}

// why: naming every tool in allowedTools is what makes approval deterministic
// under the literal auto permission mode — the session never stops to ask
// about the tools we handed it, and nothing else is widened. strictMcpConfig
// stays unset on purpose: a session inherits the user's own MCP servers.
const served = (access: ToolAccess) => ({
	allowedTools: access.names.map((name) => `mcp__${TOOL_SERVER_NAME}__${name}`),
	mcpServers: {
		[TOOL_SERVER_NAME]: {
			instance: access.server,
			name: TOOL_SERVER_NAME,
			type: "sdk" as const,
		},
	},
});

// why: the SDK's literal "auto" permission mode — ruled policy, and not
// interchangeable with bypassPermissions. cwd is resolved because it keys the
// SDK's transcript space — a non-canonical path silently forks it. No session
// id is pre-assigned: the SDK mints one and reports it in system/init, the
// same path codex threads take.
export const sessionOptions = (session: SessionShape): Options => ({
	cwd: resolve(session.cwd),
	pathToClaudeCodeExecutable: session.executable,
	permissionMode: "auto",
	...(session.resume === undefined ? {} : { resume: session.resume }),
	...Option.match(session.tools, { onNone: () => ({}), onSome: served }),
});
