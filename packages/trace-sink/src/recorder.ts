import { Cause, Effect, type Tracer } from "effect";
import type { TraceDatabase } from "#adapters/database.ts";
import { makeBoundedBuffer } from "#buffer.ts";
import type { LogRow } from "#log-row.ts";
import { type SpanRow, spanRowOf } from "#span-row.ts";

const BUFFER_CAPACITY = 20_000;
const DISABLED = "dev trace sink disabled";
const ORM_SPAN_PREFIX = "prisma.";

export interface Recorder {
	readonly flush: Effect.Effect<void>;
	readonly recordLog: (row: LogRow) => void;
	readonly recordSpan: (span: Tracer.Span) => void;
}

interface RecorderState {
	degraded: boolean;
	warning: string | undefined;
}

// why: the ORM opens a span per query, which outnumbers the domain spans a
// reader came for by three orders of magnitude and is what turns this file into
// hundreds of megabytes of index. What a query cost is the database's story and
// is asked of the database; the trace is here to say what the workspace did.
const recordable = (span: Tracer.Span): boolean =>
	span.sampled && !span.name.startsWith(ORM_SPAN_PREFIX);

const rowsOf = (span: Tracer.Span): readonly SpanRow[] => {
	const row = spanRowOf(span);
	return row === undefined ? [] : [row];
};

// why: one failure retires the sink for the rest of the run and says so once.
// Retrying a broken file every second would turn a debugging aid into a log
// flood, and a half-written trace is not worth a second chance nobody reads.
export const makeRecorder = (database: TraceDatabase): Recorder => {
	const state: RecorderState = { degraded: false, warning: undefined };
	const spans = makeBoundedBuffer<Tracer.Span>(BUFFER_CAPACITY);
	const logs = makeBoundedBuffer<LogRow>(BUFFER_CAPACITY);
	const standDown = (reason: string): void => {
		if (!state.degraded) {
			state.degraded = true;
			state.warning = reason;
		}
	};
	const write = Effect.suspend(() => {
		const pendingSpans = spans.drain();
		const pendingLogs = logs.drain();
		if (pendingSpans.length === 0 && pendingLogs.length === 0) {
			return Effect.void;
		}
		return Effect.try(() =>
			database.write(pendingSpans.flatMap(rowsOf), pendingLogs),
		).pipe(
			Effect.catchCause((cause) =>
				Effect.sync(() => standDown(Cause.pretty(cause))),
			),
		);
	});
	const announce = Effect.suspend(() => {
		const warning = state.warning;
		state.warning = undefined;
		return warning === undefined
			? Effect.void
			: Effect.logWarning(`${DISABLED}: ${warning}`);
	});
	return {
		flush: Effect.suspend(() =>
			state.degraded ? announce : write.pipe(Effect.andThen(announce)),
		),
		recordLog: (row) => {
			if (!state.degraded && !logs.push(row)) {
				standDown("the log buffer overflowed");
			}
		},
		recordSpan: (span) => {
			if (recordable(span) && !state.degraded && !spans.push(span)) {
				standDown("the span buffer overflowed");
			}
		},
	};
};
