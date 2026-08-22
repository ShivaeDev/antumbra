import { Effect, Layer, Logger, References } from "effect";
import { logRowOf } from "#log-row.ts";
import { TraceSink } from "#sink.ts";

const traceLogger = Effect.map(TraceSink, (sink) =>
	Logger.make<unknown, void>((options) => {
		sink.recordLog(logRowOf(options));
	}),
);

// why: the trace database is only the one place to look if the logs a dev run
// emits actually reach it, and Effect filters Debug out before any logger sees
// it. The console keeps its entries too: this logger joins the existing set
// rather than replacing it.
export const TraceLoggerLive = Layer.merge(
	Logger.layer([traceLogger], { mergeWithExisting: true }),
	Layer.succeed(References.MinimumLogLevel, "Debug"),
);
