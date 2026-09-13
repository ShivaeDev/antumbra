import type { sessionEvent } from "@antumbra/domain-sessions/rows/session-event.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import { make } from "@antumbra/platform-vocabulary/id.ts";
import { Context, Effect, Layer } from "effect";
import type { SessionEvent } from "#transcript/types.ts";

export class TranscriptLog extends Context.Service<
	TranscriptLog,
	{
		readonly read: (
			logId: string,
			after: number,
		) => Effect.Effect<{ readonly entries: readonly LogEntry[]; readonly unavailable: readonly string[] }>;
	}
>()("@antumbra/server/TranscriptLog") {}

export const runnerTranscriptLog = Layer.effect(
	TranscriptLog,
	Effect.gen(function* () {
		const runners = yield* RunnerOperations;
		return {
			read: Effect.fn("TranscriptLog.read")(function* (logId: string, after: number) {
				const owner = (yield* runners.connected).find((runner) => runner.logId === logId);
				if (owner === undefined) return { entries: [], unavailable: [`The runner holding log ${logId} is disconnected.`] };
				const result = yield* runners.execute(owner.runnerId, { type: "ReadLog", requestId: make(), logId, after });
				if (result.type !== "LogRead")
					return { entries: [], unavailable: [result.type === "Refused" ? result.reason : "The runner did not return its transcript."] };
				return { entries: result.entries, unavailable: [] };
			}),
		};
	}),
);

export const readLog = Effect.fn("Transcript.readLog")(function* (logId: string, references: readonly (typeof sessionEvent.Row.Type)[]) {
	const log = yield* TranscriptLog;
	const after = Math.min(...references.map((reference) => reference.cursor)) - 1;
	const result = yield* log.read(logId, after);
	const byCursor = new Map(result.entries.map((entry) => [entry.cursor, entry]));
	const events: SessionEvent[] = [];
	for (const reference of references) {
		const entry = byCursor.get(reference.cursor);
		if (entry?.event.type === "ProviderEvent") events.push({ seq: reference.sequence, event: entry.event.event });
	}
	const unavailable = [...result.unavailable];
	if (unavailable.length === 0 && references.some((reference) => !byCursor.has(reference.cursor)))
		unavailable.push("Some earlier provider events are no longer retained.");
	return { events, unavailable };
});
