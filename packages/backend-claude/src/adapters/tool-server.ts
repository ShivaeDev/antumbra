import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export const TOOL_SERVER_NAME = "antumbra";

export type ToolCall = (tool: DirectTool, args: unknown) => Promise<DirectToolOutcome>;

const listed = (tool: DirectTool) => ({
	// `anthropic/alwaysLoad` exposes the tool without a model-side search step.
	_meta: { "anthropic/alwaysLoad": true },
	description: tool.description,
	inputSchema: { ...tool.inputSchema, type: "object" as const },
	name: tool.name,
});

const said = (text: string, ok: boolean) => ({
	content: [{ text, type: "text" as const }],
	isError: !ok,
});

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
