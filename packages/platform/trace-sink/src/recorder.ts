import { Effect, type Tracer } from "effect";
import type { TraceDatabase } from "#adapters/database.ts";
import type { LogRow } from "#log-row.ts";
import { type SpanRow, spanRowOf } from "#span-row.ts";

const ORM_SPAN_PREFIX = "prisma.";

export interface Recorder {
	readonly flush: Effect.Effect<void>;
	readonly recordLog: (row: LogRow) => void;
	readonly recordSpan: (span: Tracer.Span) => void;
}

const recordable = (span: Tracer.Span): boolean => span.sampled && !span.name.startsWith(ORM_SPAN_PREFIX);

const rowsOf = (span: Tracer.Span): readonly SpanRow[] => {
	const row = spanRowOf(span);
	return row === undefined ? [] : [row];
};

export const makeRecorder = (database: TraceDatabase): Recorder => {
	let spans: Tracer.Span[] = [];
	let logs: LogRow[] = [];
	const write = Effect.suspend(() => {
		const pendingSpans = spans;
		const pendingLogs = logs;
		spans = [];
		logs = [];
		if (pendingSpans.length === 0 && pendingLogs.length === 0) {
			return Effect.void;
		}
		return Effect.try(() => database.write(pendingSpans.flatMap(rowsOf), pendingLogs)).pipe(Effect.catch(() => Effect.void));
	});
	return {
		flush: write,
		recordLog: (row) => {
			logs.push(row);
		},
		recordSpan: (span) => {
			if (recordable(span)) {
				spans.push(span);
			}
		},
	};
};
