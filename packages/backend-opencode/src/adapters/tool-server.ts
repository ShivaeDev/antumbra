import type { ToolDefinition } from "@antumbra/plugin-api";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Option, Schema } from "effect";
import type { ToolSessions } from "#tool-sessions.ts";

export const CALLER_SESSION = "callerSession";
export const TOOL_SERVER_NAME = "antumbra";

// Opencode addresses a remote tool by the server name it was configured under joined to the tool's own name.
export const wireName = (name: string): string => `${TOOL_SERVER_NAME}_${name}`;

const listed = (tool: ToolDefinition) => ({
	description: tool.description,
	inputSchema: { ...tool.inputSchema, type: "object" as const },
	name: tool.name,
});

const said = (text: string, ok: boolean): CallToolResult => ({
	content: [{ text, type: "text" as const }],
	isError: !ok,
});

const decodeArguments = Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown));

// The shipped opencode plugin writes the calling session onto every antumbra call; the tool itself never sees that field.
const caller = (args: unknown): { readonly rest: unknown; readonly session: string | undefined } =>
	Option.match(decodeArguments(args), {
		onNone: () => ({ rest: args, session: undefined }),
		onSome: ({ [CALLER_SESSION]: session, ...rest }) => ({ rest, session: typeof session === "string" ? session : undefined }),
	});

const answerCall = async (sessions: ToolSessions, name: string, args: unknown): Promise<CallToolResult> => {
	const { rest, session } = caller(args);
	if (session === undefined) {
		return said(`the call named no ${CALLER_SESSION}, so antumbra cannot tell which session is asking`, false);
	}
	const served = sessions.served(session);
	if (Option.isNone(served)) {
		return said(`antumbra serves no open session ${session}`, false);
	}
	const tool = served.value.get(name);
	if (tool === undefined) {
		return said(`session ${session} was given no tool named ${name}`, false);
	}
	const outcome = await tool(rest);
	return said(outcome.text, outcome.ok);
};

// Omitting the session-id generator makes the transport stateless, so each request gets its own protocol server and nothing is carried between them.
export const answerToolRequest = (tools: ReadonlyArray<ToolDefinition>, sessions: ToolSessions) => {
	const list = tools.map(listed);
	return async (request: Request): Promise<Response> => {
		const server = new Server({ name: TOOL_SERVER_NAME, version: "0.0.0" }, { capabilities: { tools: {} } });
		server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: list }));
		server.setRequestHandler(CallToolRequestSchema, (message) => answerCall(sessions, message.params.name, message.params.arguments));
		const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
		await server.connect(transport);
		const response = await transport.handleRequest(request);
		await server.close();
		return response;
	};
};
