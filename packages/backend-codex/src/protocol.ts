import { Schema } from "effect";

// why: hand-written schemas for the slice of the app-server protocol this
// backend consumes. The full generated schema bundle for the pinned CLI is
// vendored beside this file and a test holds every literal here to it —
// the bundle is the pin, this file is the slice we speak. Decoding is
// lenient: unknown fields drop, unmodelled items fall through as raw. The
// thread items are their own page, in `protocol-items.ts`.

export const PINNED_CLI_VERSION = "0.148.0-alpha.9";

export const InitializeResponse = Schema.Struct({ userAgent: Schema.String });

const ThreadRef = Schema.Struct({ id: Schema.String });

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

// why: the server asks us to run a tool by thread and name; the call id and
// turn id ride along on the wire as its own bookkeeping, so the slice names
// only what deciding an answer needs.
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
