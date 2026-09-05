import { Schema } from "effect";

export const PINNED_CLI_VERSION = "0.148.0-alpha.9";

export const InitializeResponse = Schema.Struct({ userAgent: Schema.String });

const ThreadRef = Schema.Struct({ id: Schema.String });

export const ThreadResponse = Schema.Struct({ thread: ThreadRef });

// Codex advertises reasoning efforts per model, so the protocol constrains one only to a non-empty string.
export const ReasoningEffort = Schema.NonEmptyString;

export const TurnStatus = Schema.Literals(["completed", "interrupted", "failed", "inProgress"]);

export const TurnError = Schema.Struct({ message: Schema.String });

export const Turn = Schema.Struct({
	durationMs: Schema.optional(Schema.NullOr(Schema.Number)),
	error: Schema.optional(Schema.NullOr(TurnError)),
	id: Schema.String,
	status: TurnStatus,
});

export const TurnResponse = Schema.Struct({ turn: Turn });

// Codex answers `model/list` with a catalog page; each model carries the reasoning efforts it advertises.
export const ModelListResponse = Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			displayName: Schema.String,
			isDefault: Schema.Boolean,
			model: Schema.String,
			supportedReasoningEfforts: Schema.Array(Schema.Struct({ reasoningEffort: ReasoningEffort })),
		}),
	),
});

export const DynamicToolCallParams = Schema.Struct({
	arguments: Schema.Unknown,
	threadId: Schema.String,
	tool: Schema.String,
});

export const ItemNotification = Schema.Struct({
	item: Schema.Unknown,
	threadId: Schema.String,
	turnId: Schema.String,
});

export const TurnNotification = Schema.Struct({
	threadId: Schema.String,
	turn: Turn,
});

// Codex may omit cache-write usage; reasoning tokens are included in output usage.
const TokenBreakdown = Schema.Struct({
	cachedInputTokens: Schema.Number,
	cacheWriteInputTokens: Schema.optional(Schema.Number),
	inputTokens: Schema.Number,
	outputTokens: Schema.Number,
});

export const TokenUsageNotification = Schema.Struct({
	threadId: Schema.String,
	tokenUsage: Schema.Struct({ last: TokenBreakdown, total: TokenBreakdown }),
	turnId: Schema.String,
});

export const ThreadScoped = Schema.Struct({ threadId: Schema.String });

// Only Codex spawn metadata carries a parent thread id; other names may be absent.
const SpawnSource = Schema.Struct({
	subAgent: Schema.Struct({
		thread_spawn: Schema.Struct({
			agent_nickname: Schema.optional(Schema.NullOr(Schema.String)),
			agent_path: Schema.optional(Schema.NullOr(Schema.String)),
			agent_role: Schema.optional(Schema.NullOr(Schema.String)),
			parent_thread_id: Schema.String,
		}),
	}),
});

export const SpawnedThread = Schema.Struct({
	thread: Schema.Struct({ id: Schema.String, source: SpawnSource }),
});

// Codex reports active, idle, notLoaded, and systemError thread states; activeFlags are extensible.
export const ThreadStatus = Schema.Union([
	Schema.Struct({
		activeFlags: Schema.Array(Schema.String),
		type: Schema.Literal("active"),
	}),
	Schema.Struct({ type: Schema.Literal("idle") }),
	Schema.Struct({ type: Schema.Literal("notLoaded") }),
	Schema.Struct({ type: Schema.Literal("systemError") }),
]);

// Codex ancestor-filtered listings return spawn metadata, status, and a continuation cursor.
export const ThreadListResponse = Schema.Struct({
	data: Schema.Array(
		Schema.Struct({
			id: Schema.String,
			source: SpawnSource,
			status: ThreadStatus,
		}),
	),
	nextCursor: Schema.optional(Schema.NullOr(Schema.String)),
});

// Codex status notifications carry the waiting flags for active threads.
export const ThreadStatusNotification = Schema.Struct({
	status: ThreadStatus,
	threadId: Schema.String,
});
