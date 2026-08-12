import { Data, Result, Schema } from "effect";

export const IntentStatusSchema = Schema.Literals([
	"queued",
	"running",
	"cancelling",
	"succeeded",
	"failed",
	"cancelled",
]);
export type IntentStatus = typeof IntentStatusSchema.Type;

export const INTENT_EVENTS = [
	"abandon",
	"admit",
	"cancel",
	"fail",
	"interrupt",
	"requeue",
	"succeed",
] as const;
export type IntentEvent = (typeof INTENT_EVENTS)[number];

export class InvalidTransition extends Data.TaggedError("InvalidTransition")<{
	readonly event: IntentEvent;
	readonly from: IntentStatus;
}> {}

// why: the lifecycle is a closed table, not code paths — every legal move is a
// row here and everything absent is InvalidTransition. "interrupt" is only
// legal from "cancelling": an interruption observed while "running" means the
// process is shutting down, which must look exactly like a crash so boot
// reclaim stays the single recovery path.
const TABLE: Record<
	IntentStatus,
	Partial<Record<IntentEvent, IntentStatus>>
> = {
	cancelled: {},
	cancelling: { fail: "failed", interrupt: "cancelled", succeed: "succeeded" },
	failed: {},
	queued: { admit: "running", cancel: "cancelled" },
	running: {
		abandon: "failed",
		cancel: "cancelling",
		fail: "failed",
		requeue: "queued",
		succeed: "succeeded",
	},
	succeeded: {},
};

export const INTENT_STATUSES = IntentStatusSchema.literals;

export const transition = (
	from: IntentStatus,
	event: IntentEvent,
): Result.Result<IntentStatus, InvalidTransition> => {
	const next = TABLE[from][event];
	return next === undefined
		? Result.fail(new InvalidTransition({ event, from }))
		: Result.succeed(next);
};
