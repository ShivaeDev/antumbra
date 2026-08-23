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

// why: the one notification that says a thread is a member of somebody's tree.
// Only a thread codex sourced from a spawn is one: a reviewer, a compaction or
// a memory pass names no parent here and so can never be admitted as a node,
// which is how the guardians stay out of the record's tree by construction.
// why: what codex says about the spawn beside the parent it names — the agent
// definition it ran, the name it gave the agent, the role it was cast in. They
// are the only names a census has for a node nothing announced, and codex may
// say none of them, so each is optional and absent means the record stays
// silent rather than inventing one.
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

// why: codex's own runtime word for a thread, required on every row it lists.
// `active` is the one variant that means a turn is under way in it; the flags
// name what a running turn is waiting on, which does not change that it is
// running and which nothing here reads — so they are typed as the strings codex
// sends rather than pinned to a spelling, because a flag added later must not
// refuse a whole census over a word this slice never consults.
export const ThreadStatus = Schema.Union([
	Schema.Struct({
		activeFlags: Schema.Array(Schema.String),
		type: Schema.Literal("active"),
	}),
	Schema.Struct({ type: Schema.Literal("idle") }),
	Schema.Struct({ type: Schema.Literal("notLoaded") }),
	Schema.Struct({ type: Schema.Literal("systemError") }),
]);

// why: the server's own listing of every thread spawned below one ancestor, at
// any depth. Every row it returns is a spawn descendant and carries the source
// that says whose, and the status that says whether it is working right now —
// so a row this cannot decode is the pin having moved under the slice, and the
// page is refused whole rather than quietly shortened. A page it did not finish
// says so in a cursor, which is the difference between a short answer and a
// whole one.
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
