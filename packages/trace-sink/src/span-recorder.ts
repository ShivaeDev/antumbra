import type { Tracer } from "effect";

// why: the tracer needs one verb and must not reach the rest of the sink. A
// span that has ended is handed over and forgotten; nothing in the tracer waits
// for, inspects, or retries what the sink does with it.
export interface SpanRecorder {
	readonly recordSpan: (span: Tracer.Span) => void;
}
