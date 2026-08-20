import { Schema } from "effect";
import { TurnError } from "#protocol.ts";

// why: the thread-item slice of the protocol, split from the envelope schemas
// so each file stays one readable page. Decoding is lenient: unknown fields
// drop, unmodelled items fall through as raw.

const item = { id: Schema.String };

export const ExecutionStatus = Schema.Literals([
	"inProgress",
	"completed",
	"failed",
	"declined",
]);

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
	changes: Schema.Array(
		Schema.Struct({ diff: Schema.String, path: Schema.String }),
	),
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

const UserMessageItem = Schema.Struct({
	...item,
	content: Schema.Array(ContentPart),
	type: Schema.Literal("userMessage"),
});

// why: only the modelled variants form the union, so a literal `type`
// discriminates every member; anything else stays `unknown` and is logged raw
// rather than decoded into a shape it does not have.
export const KnownItem = Schema.Union([
	AgentMessageItem,
	UserMessageItem,
	ReasoningItem,
	CommandExecutionItem,
	DynamicToolCallItem,
	FileChangeItem,
	McpToolCallItem,
	WebSearchItem,
]);
export type KnownItem = typeof KnownItem.Type;
