import { Effect, Layer, Logger, References, Tracer } from "effect";
import { makeTraceLogger } from "#logger.ts";
import type { Recorder } from "#recorder.ts";
import { makeTraceSink } from "#sink.ts";
import { makeRecordingTracer } from "#tracer.ts";

const FLUSH_MILLIS = 1_000;

export interface DevTraceOptions {
	readonly appVersion: string;
	readonly dataDirectory: string;
}

const tracingLayers = (recorder: Recorder) =>
	Layer.mergeAll(
		Layer.succeed(Tracer.Tracer, makeRecordingTracer(recorder.recordSpan)),
		Logger.layer([makeTraceLogger(recorder)], { mergeWithExisting: true }),
		Layer.succeed(References.MinimumLogLevel, "Debug"),
	);

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
