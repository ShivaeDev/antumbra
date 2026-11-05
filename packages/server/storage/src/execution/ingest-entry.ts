import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { StampedEvent } from "#execution/definition.ts";
import type { RunnerEntry } from "#execution/ingest.ts";
import { observationEvent } from "#execution/observation.ts";
import { append, read } from "#execution/write.ts";
export const ingestEntry = Effect.fn("ExecutionHistory.ingestEntry")(function* (logId: string, entry: RunnerEntry) {
	yield* entry.before;
	const current = yield* read();
	let sequence = current.at(-1)?.value.sequence ?? 0;
	const events: StampedEvent[] = [];
	for (const fact of entry.facts) {
		const value = yield* observationEvent(fact, current, entry.at, sequence + 1);
		if (value === undefined) continue;
		events.push(value);
		sequence++;
	}
	events.push({ _tag: "RunnerCursorAdvanced", logId: logId, cursor: entry.cursor, at: entry.at, sequence });
	yield* append(Request.make(`runner:${logId}:${entry.cursor}`), events);
});
