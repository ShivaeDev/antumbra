interface ToolCall {
	readonly callID: string;
	readonly sessionID: string;
	readonly tool: string;
}

interface ToolInput {
	args: Record<string, unknown>;
}

interface CallerSessionHooks {
	readonly "tool.execute.before": (call: ToolCall, input: ToolInput) => Promise<void>;
}

declare const callerSession: () => Promise<CallerSessionHooks>;

export default callerSession;
