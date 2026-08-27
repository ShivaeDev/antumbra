import { type Exit, Tracer } from "effect";
import type { SpanRecorder } from "#span-recorder.ts";

type NativeSpanOptions = ConstructorParameters<typeof Tracer.NativeSpan>[0];

// why: Effect's own span already generates the identifiers, holds the
// attributes, and records the exit. Extending it means the sink records exactly
// what the runtime saw, and a future Effect release changes both at once.
class RecordedSpan extends Tracer.NativeSpan {
	readonly #record: (span: Tracer.Span) => void;

	constructor(options: NativeSpanOptions, record: (span: Tracer.Span) => void) {
		super(options);
		this.#record = record;
	}

	override end(endTime: bigint, exit: Exit.Exit<unknown, unknown>): void {
		super.end(endTime, exit);
		this.#record(this);
	}
}

export const makeRecordingTracer = (recorder: SpanRecorder): Tracer.Tracer =>
	Tracer.make({
		span: (options) => new RecordedSpan(options, recorder.recordSpan),
	});
