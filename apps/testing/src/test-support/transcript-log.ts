import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import { TranscriptLog } from "@antumbra/server/transcript/read-log.ts";
import { Effect, Layer, Ref } from "effect";

export const scriptedTranscriptLog = Effect.fn("PostgresApp.transcriptLog")(function* () {
	const logs = yield* Ref.make<ReadonlyMap<string, readonly LogEntry[]>>(new Map());
	const log = {
		read: (logId: string, after: number) =>
			Effect.map(Ref.get(logs), (known) => {
				const entries = known.get(logId);
				return entries === undefined
					? { entries: [], unavailable: [`The runner holding log ${logId} is disconnected.`] }
					: { entries: entries.filter((entry) => entry.cursor > after), unavailable: [] };
			}),
	};
	return {
		layer: Layer.succeed(TranscriptLog, log),
		retainRunnerLog: (logId: string, entries: readonly LogEntry[]) => Ref.update(logs, (known) => new Map([...known, [logId, entries]])),
		disconnectTranscript: (logId: string) => Ref.update(logs, (known) => new Map([...known].filter(([id]) => id !== logId))),
	};
});
