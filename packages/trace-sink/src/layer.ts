import { Layer } from "effect";
import { TraceLoggerLive } from "#logger.ts";
import { TraceSinkLive } from "#sink.ts";
import { TracerLive } from "#tracer.ts";

// why: one second of spans is a small enough tail to lose to a crash and a long
// enough window that a busy run writes in batches rather than per span.
const FLUSH_MILLIS = 1_000;

export interface DevTraceOptions {
	readonly appVersion: string;
	readonly dataDirectory: string;
}

// why: dev composition only. The packaged app provides none of this, so a
// release carries no tracer, no second logger, and no trace database at all.
export const DevTraceLive = (options: DevTraceOptions) =>
	Layer.provide(
		Layer.merge(TracerLive, TraceLoggerLive),
		TraceSinkLive({
			appVersion: options.appVersion,
			dataDirectory: options.dataDirectory,
			flushMillis: FLUSH_MILLIS,
		}),
	);
