import { Effect, Layer, Logger, References, Tracer } from "effect";
import { makeTraceLogger } from "#logger.ts";
import type { Recorder } from "#recorder.ts";
import { makeTraceSink } from "#sink.ts";
import { makeRecordingTracer } from "#tracer.ts";

// why: one second of spans is a small enough tail to lose to a crash and a long
// enough window that a busy run writes in batches rather than per span.
const FLUSH_MILLIS = 1_000;

export interface DevTraceOptions {
	readonly appVersion: string;
	readonly dataDirectory: string;
}

const tracingLayers = (recorder: Recorder) =>
	Layer.merge(
		Layer.succeed(Tracer.Tracer, makeRecordingTracer(recorder)),
		Layer.merge(
			// why: the trace database is only the one place to look if the logs a
			// dev run emits actually reach it, and Effect filters Debug out before
			// any logger sees it. The console keeps its entries too: this logger
			// joins the existing set rather than replacing it.
			Logger.layer([makeTraceLogger(recorder)], { mergeWithExisting: true }),
			Layer.succeed(References.MinimumLogLevel, "Debug"),
		),
	);

// why: dev composition only. The packaged app provides none of this, so a
// release carries no tracer, no second logger, and no trace database at all.
export const DevTraceLive = (options: DevTraceOptions) =>
	Layer.unwrap(
		Effect.map(
			makeTraceSink({
				appVersion: options.appVersion,
				dataDirectory: options.dataDirectory,
				flushMillis: FLUSH_MILLIS,
			}),
			tracingLayers,
		),
	);
