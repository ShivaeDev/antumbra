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

const TABLE: Record<
	SessionExecutionStatus,
	Partial<Record<SessionExecutionEvent, SessionExecutionStatus>>
> = {
	active: { "request-siesta": "draining" },
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
