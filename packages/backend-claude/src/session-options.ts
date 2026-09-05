import { resolve } from "node:path";
import type { EffortLevel, Options, SessionStore } from "@anthropic-ai/claude-agent-sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Option } from "effect";
import { TOOL_SERVER_NAME } from "#adapters/tool-server.ts";

export interface ToolAccess {
	readonly names: ReadonlyArray<string>;
	readonly server: McpServer;
}

interface SessionShape {
	readonly constrainedPrompt: string | undefined;
	readonly cwd: string;
	readonly effort: EffortLevel | undefined;
	readonly executable: string;
	readonly model: string | undefined;
	readonly resume: string | undefined;
	readonly skills: string;
	readonly store: SessionStore;
	readonly tools: Option.Option<ToolAccess>;
}

// Under `auto` permission mode, each served MCP tool must be listed to avoid an approval stop.
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

// An empty `settingSources` is the SDK's isolation mode: no settings files and no CLAUDE.md. An empty `tools` leaves the built-in tools out, and
// `strictMcpConfig` keeps every MCP server but the one passed here from reaching the session.
const harness = (session: SessionShape) =>
	session.constrainedPrompt === undefined
		? { plugins: [{ path: session.skills, type: "local" as const }] }
		: { settingSources: [], strictMcpConfig: true, systemPrompt: session.constrainedPrompt, tools: [] };

// Claude keys transcript storage by canonical cwd. Delegated-agent text requires `forwardSubagentText`; workflow-agent records are available only
// through `sessionStore`.
export const sessionOptions = (session: SessionShape): Options => ({
	cwd: resolve(session.cwd),
	forwardSubagentText: true,
	pathToClaudeCodeExecutable: session.executable,
	permissionMode: "auto",
	sessionStore: session.store,
	sessionStoreFlush: "eager",
	...harness(session),
	...(session.effort === undefined ? {} : { effort: session.effort }),
	...(session.model === undefined ? {} : { model: session.model }),
	...(session.resume === undefined ? {} : { resume: session.resume }),
	...Option.match(session.tools, { onNone: () => ({}), onSome: served }),
});
