import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export const TOOL_SERVER_NAME = "antumbra";

// why: MCP hands the handler a promise boundary, so the session supplies the
// one way a call may be run — the promise settles when the call's own fiber
// does, and that fiber belongs to the session rather than to this request.
export type ToolCall = (tool: DirectTool, args: unknown) => Promise<DirectToolOutcome>;

const listed = (tool: DirectTool) => ({
	// why: without alwaysLoad the model has to search for a tool before it can
	// call it — measured against the real harness.
	_meta: { "anthropic/alwaysLoad": true },
	description: tool.description,
	inputSchema: { ...tool.inputSchema, type: "object" as const },
	name: tool.name,
});

const said = (text: string, ok: boolean) => ({
	content: [{ text, type: "text" as const }],
	isError: !ok,
});

// why: the SDK's own tool() helper takes zod schemas, which this workspace does
// not ship; the low-level handlers take the JSON Schema every tool already
// carries, so serving tools adds no second schema library.
export const makeToolServer = (tools: ReadonlyArray<DirectTool>, call: ToolCall): McpServer => {
	const byName = new Map(tools.map((tool) => [tool.name, tool]));
	const server = new McpServer({ name: TOOL_SERVER_NAME, version: "0.0.0" });
	server.server.registerCapabilities({ tools: { listChanged: true } });
	server.server.setRequestHandler(ListToolsRequestSchema, () => ({
		tools: tools.map(listed),
	}));
	server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const tool = byName.get(request.params.name);
		if (tool === undefined) {
			return said(`antumbra serves no tool named ${request.params.name}`, false);
		}
		const outcome = await call(tool, request.params.arguments);
		return said(outcome.text, outcome.ok);
	});
	return server;
};
