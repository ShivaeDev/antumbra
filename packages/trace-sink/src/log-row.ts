import { Cause, type Logger, type LogLevel, References } from "effect";
import { serializeRecord } from "#attributes.ts";

export interface LogRow {
	readonly annotations: string;
	readonly atMillis: number;
	readonly fiberId: number;
	readonly level: LogLevel.LogLevel;
	readonly message: string;
	readonly spanId: string | null;
	readonly traceId: string | null;
}

const text = (value: unknown): string =>
	typeof value === "string"
		? value
		: (JSON.stringify(value, (_key, nested: unknown) => (typeof nested === "bigint" ? nested.toString() : nested)) ?? String(value));

const messageOf = (message: unknown): string => (Array.isArray(message) ? message.map(text).join(" ") : text(message));

// why: a log entry that carries a failure is only half a record without it, and
// the console logger is not the one being read after the fact.
const withCause = (message: string, cause: Cause.Cause<unknown>): string =>
	cause.reasons.length === 0 ? message : `${message}\n${Cause.pretty(cause)}`;

export const logRowOf = (options: Logger.Options<unknown>): LogRow => {
	const span = options.fiber.currentSpan;
	return {
		annotations: serializeRecord({
			...options.fiber.getRef(References.CurrentLogAnnotations),
		}),
		atMillis: options.date.getTime(),
		fiberId: options.fiber.id,
		level: options.logLevel,
		message: withCause(messageOf(options.message), options.cause),
		spanId: span?.spanId ?? null,
		traceId: span?.traceId ?? null,
	};
};
