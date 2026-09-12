import { CALLER_CALL, CALLER_SESSION, TOOL_SERVER_NAME } from "@antumbra/runner-backends-opencode/tool-names.ts";
import type { ToolSessions } from "@antumbra/runner-backends-opencode/tool-sessions.ts";
import type { ToolDefinition } from "@antumbra/runner-ports/tools.ts";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Effect, Option, Schema } from "effect";

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
const caller = (args: unknown): { readonly rest: unknown; readonly session: string | undefined; readonly callId: string | undefined } =>
	Option.match(decodeArguments(args), {
		onNone: () => ({ rest: args, session: undefined, callId: undefined }),
		onSome: ({ [CALLER_SESSION]: session, [CALLER_CALL]: callId, ...rest }) => ({
			rest,
			session: typeof session === "string" ? session : undefined,
			callId: typeof callId === "string" ? callId : undefined,
		}),
	});

const answerCall = async (sessions: ToolSessions, name: string, args: unknown): Promise<CallToolResult> => {
	const { rest, session, callId } = caller(args);
	if (session === undefined) {
		return said(`the call named no ${CALLER_SESSION}, so antumbra cannot tell which session is asking`, false);
	}
	if (callId === undefined) {
		return said(`the call named no ${CALLER_CALL}, so antumbra cannot identify the provider call`, false);
	}
	const served = sessions.served(session);
	if (Option.isNone(served)) {
		return said(`antumbra serves no open session ${session}`, false);
	}
	const tool = served.value.get(name);
	if (tool === undefined) {
		return said(`session ${session} was given no tool named ${name}`, false);
	}
	const outcome = await tool(callId, rest);
	return said(outcome.text, outcome.ok);
};

// Omitting the session-id generator makes the transport stateless, so each request gets its own protocol server and nothing is carried between them.
export const answerToolRequest = (tools: ReadonlyArray<ToolDefinition>, sessions: ToolSessions) => {
	const list = tools.map(listed);
	return async (request: Request): Promise<Response> => {
		const server = new Server({ name: TOOL_SERVER_NAME, version: "0.0.0" }, { capabilities: { tools: {} } });
		server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: list }));
		server.setRequestHandler(CallToolRequestSchema, (message, extra) =>
			Effect.runPromise(
				Effect.scoped(
					Effect.gen(function* () {
						const token = message.params._meta?.progressToken;
						if (token !== undefined) {
							let progress = 0;
							const report = Effect.promise(() =>
								extra.sendNotification({ method: "notifications/progress", params: { progressToken: token, progress: progress++ } }),
							);
							yield* report;
							yield* Effect.forkScoped(Effect.forever(Effect.andThen(Effect.sleep(30_000), report)));
						}
						return yield* Effect.promise(() => answerCall(sessions, message.params.name, message.params.arguments));
					}),
				),
				{ signal: extra.signal },
			),
		);
		const transport = new WebStandardStreamableHTTPServerTransport();
		await server.connect(transport);
		const response = await transport.handleRequest(request);
		if (response.body === null) {
			await server.close();
			return response;
		}
		const reader = response.body.getReader();
		const body = new ReadableStream<Uint8Array>({
			async pull(controller) {
				try {
					const next = await reader.read();
					if (next.done) {
						await server.close();
						controller.close();
					} else {
						controller.enqueue(next.value);
					}
				} catch (error) {
					await server.close();
					controller.error(error);
				}
			},
			async cancel() {
				await reader.cancel();
				await server.close();
			},
		});
		return new Response(body, { headers: response.headers, status: response.status });
	};
};
