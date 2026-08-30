import { Schema } from "effect";
import { TurnError } from "#protocol.ts";
import { UserMessageItem } from "#protocol-user-item.ts";

// why: the thread-item slice of the protocol, split from the envelope schemas
// so each file stays one readable page. Decoding is lenient: unknown fields
// drop, unmodelled items fall through as raw.

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

// why: the call the model makes on a tool we served at thread start. Its id is
// the call id, and `success` is what we answered with — status alone would
// read a refused landing as a completed call.
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

// why: the item a thread posts about an agent of its own — the announcement
// this backend's tree is built from. The kinds are codex's own closed set, and
// only `started` names a node: `interacted` says a running one was spoken to,
// and `interrupted` is the provider's word for a forced ending.
const SubAgentActivityItem = Schema.Struct({
	...item,
	agentPath: Schema.String,
	agentThreadId: Schema.String,
	kind: Schema.Literals(["started", "interacted", "interrupted"]),
	type: Schema.Literal("subAgentActivity"),
});

// why: the call that spawns, drives, or closes an agent of this thread's own.
// It reads as a tool call because that is what it is, and its id is what the
// announcement that follows names as the call the node was spawned by.
const CollabAgentToolCallItem = Schema.Struct({
	...item,
	prompt: Schema.optional(Schema.NullOr(Schema.String)),
	receiverThreadIds: Schema.Array(Schema.String),
	senderThreadId: Schema.String,
	status: Schema.Literals(["inProgress", "completed", "failed"]),
	tool: Schema.Literals(["spawnAgent", "sendInput", "resumeAgent", "wait", "closeAgent"]),
	type: Schema.Literal("collabAgentToolCall"),
});

// why: only the modelled variants form the union, so a literal `type`
// discriminates every member; anything else stays `unknown` and is logged raw
// rather than decoded into a shape it does not have.
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
