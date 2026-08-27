import { Logger } from "effect";
import { logRowOf } from "#log-row.ts";
import type { Recorder } from "#recorder.ts";

export const makeTraceLogger = (recorder: Recorder) =>
	Logger.make<unknown, void>((options) => {
		recorder.recordLog(logRowOf(options));
	});
