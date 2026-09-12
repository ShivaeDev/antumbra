import { Schema } from "effect";
import { TurnError } from "#protocol.ts";
import { UserMessageItem } from "#protocol-user-item.ts";

const item = { id: Schema.String };

export const ExecutionStatus = Schema.Literals(["inProgress", "completed", "failed", "declined"]);

const AgentMessageItem = Schema.Struct({
	...item,
	text: Schema.String,
	type: Schema.Literal("agentMessage"),
});

const ReasoningItem = Schema.Struct({
	...item,
	content: Schema.optional(Schema.Array(Schema.String)),
	summary: Schema.optional(Schema.Array(Schema.String)),
	type: Schema.Literal("reasoning"),
});

const CommandExecutionItem = Schema.Struct({
	...item,
	aggregatedOutput: Schema.optional(Schema.NullOr(Schema.String)),
	command: Schema.String,
	cwd: Schema.String,
	exitCode: Schema.optional(Schema.NullOr(Schema.Number)),
	status: ExecutionStatus,
	type: Schema.Literal("commandExecution"),
});

const FileChangeItem = Schema.Struct({
	...item,
	changes: Schema.Array(Schema.Struct({ diff: Schema.String, path: Schema.String })),
	status: ExecutionStatus,
	type: Schema.Literal("fileChange"),
});

const McpToolCallItem = Schema.Struct({
	...item,
	arguments: Schema.Unknown,
	error: Schema.optional(Schema.NullOr(TurnError)),
	result: Schema.optional(Schema.Unknown),
	server: Schema.String,
	status: Schema.Literals(["inProgress", "completed", "failed"]),
	tool: Schema.String,
	type: Schema.Literal("mcpToolCall"),
});

const ContentPart = Schema.Struct({
	text: Schema.optional(Schema.String),
	type: Schema.String,
});

// Codex reports dynamic-tool outcomes through `success` in addition to status.
const DynamicToolCallItem = Schema.Struct({
	...item,
	arguments: Schema.Unknown,
	contentItems: Schema.optional(Schema.NullOr(Schema.Array(ContentPart))),
	status: Schema.Literals(["inProgress", "completed", "failed"]),
	success: Schema.optional(Schema.NullOr(Schema.Boolean)),
	tool: Schema.String,
	type: Schema.Literal("dynamicToolCall"),
});

const WebSearchItem = Schema.Struct({
	...item,
	query: Schema.String,
	type: Schema.Literal("webSearch"),
});

// Codex reports sub-agent lifecycle as started, interacted, or interrupted.
const SubAgentActivityItem = Schema.Struct({
	...item,
	agentPath: Schema.String,
	agentThreadId: Schema.String,
	kind: Schema.Literals(["started", "interacted", "interrupted"]),
	type: Schema.Literal("subAgentActivity"),
});

// Codex reports collaboration operations as dynamic-tool items.
const CollabAgentToolCallItem = Schema.Struct({
	...item,
	prompt: Schema.optional(Schema.NullOr(Schema.String)),
	receiverThreadIds: Schema.Array(Schema.String),
	senderThreadId: Schema.String,
	status: Schema.Literals(["inProgress", "completed", "failed"]),
	tool: Schema.Literals(["spawnAgent", "sendInput", "resumeAgent", "wait", "closeAgent"]),
	type: Schema.Literal("collabAgentToolCall"),
});

export const KnownItem = Schema.Union([
	AgentMessageItem,
	UserMessageItem,
	ReasoningItem,
	CollabAgentToolCallItem,
	CommandExecutionItem,
	DynamicToolCallItem,
	FileChangeItem,
	McpToolCallItem,
	SubAgentActivityItem,
	WebSearchItem,
]);
export type KnownItem = typeof KnownItem.Type;
