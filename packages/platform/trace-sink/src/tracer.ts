import { type Exit, Tracer } from "effect";

type NativeSpanOptions = ConstructorParameters<typeof Tracer.NativeSpan>[0];

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

export const makeRecordingTracer = (recordSpan: (span: Tracer.Span) => void): Tracer.Tracer =>
	Tracer.make({
		span: (options) => new RecordedSpan(options, recordSpan),
	});
