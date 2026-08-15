import { Schema } from "effect";

// why: hand-written schemas for the slice of the app-server protocol this
// backend consumes. The full generated schema bundle for the pinned CLI is
// vendored beside this file and a test holds every literal here to it —
// the bundle is the pin, this file is the slice we speak. Decoding is
// lenient: unknown fields drop, unmodelled items fall through as raw.

export const PINNED_CLI_VERSION = "0.148.0-alpha.9";

export const InitializeResponse = Schema.Struct({ userAgent: Schema.String });

export const ThreadRef = Schema.Struct({ id: Schema.String });

export const ThreadResponse = Schema.Struct({ thread: ThreadRef });

export const TurnStatus = Schema.Literals([
	"completed",
	"interrupted",
	"failed",
	"inProgress",
]);

export const TurnError = Schema.Struct({ message: Schema.String });

export const Turn = Schema.Struct({
	durationMs: Schema.optional(Schema.NullOr(Schema.Number)),
	error: Schema.optional(Schema.NullOr(TurnError)),
	id: Schema.String,
	status: TurnStatus,
});

export const TurnResponse = Schema.Struct({ turn: Turn });

export const TurnSteerResponse = Schema.Struct({ turnId: Schema.String });

const item = { id: Schema.String };

export const ExecutionStatus = Schema.Literals([
	"inProgress",
	"completed",
	"failed",
	"declined",
]);

export const AgentMessageItem = Schema.Struct({
	...item,
	text: Schema.String,
	type: Schema.Literal("agentMessage"),
});

export const ReasoningItem = Schema.Struct({
	...item,
	content: Schema.optional(Schema.Array(Schema.String)),
	summary: Schema.optional(Schema.Array(Schema.String)),
	type: Schema.Literal("reasoning"),
});

export const CommandExecutionItem = Schema.Struct({
	...item,
	aggregatedOutput: Schema.optional(Schema.NullOr(Schema.String)),
	command: Schema.String,
	cwd: Schema.String,
	exitCode: Schema.optional(Schema.NullOr(Schema.Number)),
	status: ExecutionStatus,
	type: Schema.Literal("commandExecution"),
});

export const FileChangeItem = Schema.Struct({
	...item,
	changes: Schema.Array(
		Schema.Struct({ diff: Schema.String, path: Schema.String }),
	),
	status: ExecutionStatus,
	type: Schema.Literal("fileChange"),
});

export const McpToolCallItem = Schema.Struct({
	...item,
	arguments: Schema.Unknown,
	error: Schema.optional(Schema.NullOr(TurnError)),
	result: Schema.optional(Schema.Unknown),
	server: Schema.String,
	status: Schema.Literals(["inProgress", "completed", "failed"]),
	tool: Schema.String,
	type: Schema.Literal("mcpToolCall"),
});

export const WebSearchItem = Schema.Struct({
	...item,
	query: Schema.String,
	type: Schema.Literal("webSearch"),
});

export const UserMessageItem = Schema.Struct({
	...item,
	content: Schema.Array(
		Schema.Struct({
			text: Schema.optional(Schema.String),
			type: Schema.String,
		}),
	),
	type: Schema.Literal("userMessage"),
});

// why: only the modelled variants form the union, so a literal `type`
// discriminates every member; anything else stays `unknown` and is logged
// raw rather than decoded into a shape it does not have.
export const KnownItem = Schema.Union([
	AgentMessageItem,
	UserMessageItem,
	ReasoningItem,
	CommandExecutionItem,
	FileChangeItem,
	McpToolCallItem,
	WebSearchItem,
]);
export type KnownItem = typeof KnownItem.Type;

export const ItemNotification = Schema.Struct({
	item: Schema.Unknown,
	threadId: Schema.String,
	turnId: Schema.String,
});

export const TurnNotification = Schema.Struct({
	threadId: Schema.String,
	turn: Turn,
});

const TokenBreakdown = Schema.Struct({
	inputTokens: Schema.Number,
	outputTokens: Schema.Number,
});

export const TokenUsageNotification = Schema.Struct({
	threadId: Schema.String,
	tokenUsage: Schema.Struct({ last: TokenBreakdown, total: TokenBreakdown }),
	turnId: Schema.String,
});

export const ThreadScoped = Schema.Struct({ threadId: Schema.String });
