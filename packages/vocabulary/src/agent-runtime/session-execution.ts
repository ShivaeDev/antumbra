import { Data, Option, Result, Schema } from "effect";

export const SessionExecutionStatusSchema = Schema.Literals([
	"active",
	"draining",
	"idle",
]);
export type SessionExecutionStatus = typeof SessionExecutionStatusSchema.Type;

export const SESSION_EXECUTION_EVENTS = [
	"request-siesta",
	"settle",
	"stand-down",
	"wake",
] as const;
export type SessionExecutionEvent = (typeof SESSION_EXECUTION_EVENTS)[number];

export class InvalidSessionExecutionStatus extends Data.TaggedError(
	"InvalidSessionExecutionStatus",
)<{
	readonly sessionId: string;
	readonly value: unknown;
}> {}

export class InvalidSessionExecutionTransition extends Data.TaggedError(
	"InvalidSessionExecutionTransition",
)<{
	readonly event: SessionExecutionEvent;
	readonly from: SessionExecutionStatus;
	readonly sessionId: string;
}> {}

// why: "idle" says the Session is not executing work; it says nothing about
// whether a process is still attached to it. Standing down reaches idle while
// the acquisition stays open and listening, and reclaiming that acquisition
// later leaves the same row untouched — so a restart, which necessarily takes
// every attachment with it, needs no repair to tell the truth.
const TABLE: Record<
	SessionExecutionStatus,
	Partial<Record<SessionExecutionEvent, SessionExecutionStatus>>
> = {
	active: { "request-siesta": "draining", "stand-down": "idle" },
	draining: { settle: "idle" },
	idle: { wake: "active" },
};

export const decodeSessionExecutionStatus = (
	sessionId: string,
	value: unknown,
): Result.Result<SessionExecutionStatus, InvalidSessionExecutionStatus> => {
	const decoded = Schema.decodeUnknownOption(SessionExecutionStatusSchema)(
		value,
	);
	return Option.isSome(decoded)
		? Result.succeed(decoded.value)
		: Result.fail(new InvalidSessionExecutionStatus({ sessionId, value }));
};

export const sessionExecutionTransition = (
	sessionId: string,
	from: SessionExecutionStatus,
	event: SessionExecutionEvent,
): Result.Result<SessionExecutionStatus, InvalidSessionExecutionTransition> => {
	const next = TABLE[from][event];
	return next === undefined
		? Result.fail(
				new InvalidSessionExecutionTransition({ event, from, sessionId }),
			)
		: Result.succeed(next);
};
