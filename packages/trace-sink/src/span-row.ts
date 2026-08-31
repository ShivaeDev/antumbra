import { Cause, type Exit, Option, type Tracer } from "effect";
import { type Identifiers, identifiersOf, serializeAttributes } from "#attributes.ts";

const NANOS_PER_MILLI = 1_000_000n;

type SpanStatusName = "failure" | "interrupted" | "success";

export interface SpanRow extends Identifiers {
	readonly attributes: string;
	readonly durationNanos: number;
	readonly endedAtMillis: number;
	readonly error: string | null;
	readonly name: string;
	readonly parentSpanId: string | null;
	readonly spanId: string;
	readonly startedAtMillis: number;
	readonly status: SpanStatusName;
	readonly traceId: string;
}

interface SpanOutcome {
	readonly error: string | null;
	readonly status: SpanStatusName;
}

const outcomeOf = (exit: Exit.Exit<unknown, unknown>): SpanOutcome => {
	if (exit._tag === "Success") {
		return { error: null, status: "success" };
	}
	if (Cause.hasInterruptsOnly(exit.cause)) {
		return { error: null, status: "interrupted" };
	}
	return { error: Cause.pretty(exit.cause), status: "failure" };
};

const millisOf = (nanos: bigint): number => Number(nanos / NANOS_PER_MILLI);

export const spanRowOf = (span: Tracer.Span): SpanRow | undefined => {
	const status = span.status;
	if (status._tag !== "Ended") {
		return undefined;
	}
	const outcome = outcomeOf(status.exit);
	return {
		...identifiersOf(span.attributes),
		attributes: serializeAttributes(span.attributes),
		durationNanos: Number(status.endTime - status.startTime),
		endedAtMillis: millisOf(status.endTime),
		error: outcome.error,
		name: span.name,
		parentSpanId: Option.getOrUndefined(span.parent)?.spanId ?? null,
		spanId: span.spanId,
		startedAtMillis: millisOf(status.startTime),
		status: outcome.status,
		traceId: span.traceId,
	};
};
