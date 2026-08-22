import { join } from "node:path";
import { Cause, Clock, Context, Effect, Layer, type Scope } from "effect";
import { openTraceDatabase } from "#adapters/database.ts";
import type { LogRow } from "#log-row.ts";
import { makeRecorder } from "#recorder.ts";
import type { SpanRecorder } from "#span-recorder.ts";

export const TRACE_DATABASE_FILE = "traces.db";

const DISABLED = "dev trace sink disabled";

export interface TraceSinkService extends SpanRecorder {
	readonly recordLog: (row: LogRow) => void;
	readonly runId: string;
}

export class TraceSink extends Context.Service<TraceSink, TraceSinkService>()(
	"@antumbra/trace-sink/TraceSink",
) {}

export interface TraceSinkOptions {
	readonly appVersion: string;
	readonly dataDirectory: string;
	readonly flushMillis: number;
}

// why: a trace database that cannot be opened costs the run one warning and
// nothing else. Failing the Layer here would let a full disk stop the app from
// starting, which is the opposite of what a debugging aid is for.
const openOrWarn = (options: TraceSinkOptions, runId: string, at: number) =>
	Effect.try(() =>
		openTraceDatabase({
			appVersion: options.appVersion,
			path: join(options.dataDirectory, TRACE_DATABASE_FILE),
			runId,
			startedAtMillis: at,
		}),
	).pipe(
		Effect.catchCause((cause) =>
			Effect.logWarning(`${DISABLED}: ${Cause.pretty(cause)}`).pipe(
				Effect.as(undefined),
			),
		),
	);

export const makeTraceSink = (
	options: TraceSinkOptions,
): Effect.Effect<TraceSinkService, never, Scope.Scope> =>
	Effect.gen(function* () {
		const runId = crypto.randomUUID();
		const startedAtMillis = yield* Clock.currentTimeMillis;
		const database = yield* Effect.acquireRelease(
			openOrWarn(options, runId, startedAtMillis),
			(open) => Effect.sync(() => open?.close()),
		);
		if (database === undefined) {
			return { recordLog: () => undefined, recordSpan: () => undefined, runId };
		}
		const recorder = makeRecorder(database);
		yield* Effect.addFinalizer(() => recorder.flush);
		yield* Effect.forkScoped(
			Effect.sleep(options.flushMillis).pipe(
				Effect.andThen(recorder.flush),
				Effect.forever,
			),
		);
		return {
			recordLog: recorder.recordLog,
			recordSpan: recorder.recordSpan,
			runId,
		};
	});

export const TraceSinkLive = (
	options: TraceSinkOptions,
): Layer.Layer<TraceSink> => Layer.effect(TraceSink)(makeTraceSink(options));
