import type { DirectTool } from "@antumbra/runner-ports/tools.ts";
import { type AgentToolResult, defineTool, type ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { ToolCall } from "#adapters/tool-call.ts";

// pi reads a refusal from a thrown error and hands the model an error tool result carrying its text.
export const piToolAnswer =
	(tool: DirectTool, call: ToolCall) =>
	async (toolCallId: string, params: unknown): Promise<AgentToolResult<undefined>> => {
		const outcome = await call(tool, toolCallId, params);
		if (!outcome.ok) {
			throw new Error(outcome.text);
		}
		return { content: [{ text: outcome.text, type: "text" }], details: undefined };
	};

const piTool = (tool: DirectTool, call: ToolCall): ToolDefinition =>
	defineTool({
		description: tool.description,
		execute: piToolAnswer(tool, call),
		label: tool.name,
		name: tool.name,
		parameters: tool.inputSchema,
	});

export const piTools = (tools: ReadonlyArray<DirectTool>, call: ToolCall): ReadonlyArray<ToolDefinition> => tools.map((tool) => piTool(tool, call));
