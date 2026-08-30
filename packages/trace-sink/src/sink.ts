import { join } from "node:path";
import { Clock, Effect, type Scope } from "effect";
import { openTraceDatabase } from "#adapters/database.ts";
import { makeRecorder, type Recorder } from "#recorder.ts";

export const TRACE_DATABASE_FILE = "traces.db";

const DISABLED = "dev trace sink disabled";

export interface TraceSinkOptions {
	readonly appVersion: string;
	readonly dataDirectory: string;
	readonly flushMillis: number;
}

const openOrWarn = (options: TraceSinkOptions, runId: string, at: number) =>
	Effect.try(() =>
		openTraceDatabase({
			appVersion: options.appVersion,
			path: join(options.dataDirectory, TRACE_DATABASE_FILE),
			runId,
			startedAtMillis: at,
		}),
	).pipe(Effect.catch((error) => Effect.logWarning(`${DISABLED}: ${error}`).pipe(Effect.as(undefined))));

export const makeTraceSink = (options: TraceSinkOptions): Effect.Effect<Recorder, never, Scope.Scope> =>
	Effect.gen(function* () {
		const runId = crypto.randomUUID();
		const startedAtMillis = yield* Clock.currentTimeMillis;
		const database = yield* Effect.acquireRelease(openOrWarn(options, runId, startedAtMillis), (open) => Effect.sync(() => open?.close()));
		if (database === undefined) {
			return {
				flush: Effect.void,
				recordLog: () => undefined,
				recordSpan: () => undefined,
			};
		}
		const recorder = makeRecorder(database);
		yield* Effect.addFinalizer(() => recorder.flush);
		yield* Effect.forkScoped(Effect.sleep(options.flushMillis).pipe(Effect.andThen(recorder.flush), Effect.forever));
		return recorder;
	});
