import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { StampedEvent } from "#postgres/execution/definition.ts";
import type { RunnerEntry } from "#postgres/execution/ingest.ts";
import { observationEvent } from "#postgres/execution/observation.ts";
import type { State } from "#postgres/execution/state.ts";
import { append, read } from "#postgres/execution/write.ts";
export const ingestEntry = (state: State) =>
	Effect.fn("ExecutionHistory.ingestEntry")(function* (logId: string, entry: RunnerEntry) {
		yield* entry.before;
		const current = yield* read(state)();
		let sequence = current.at(-1)?.value.sequence ?? 0;
		const events: StampedEvent[] = [];
		for (const fact of entry.facts) {
			const value = yield* observationEvent(state)(fact, current, entry.at, sequence + 1);
			if (value === undefined) continue;
			events.push(value);
			sequence++;
		}
		events.push({ _tag: "RunnerCursorAdvanced", logId: logId, cursor: entry.cursor, at: entry.at, sequence });
		yield* append(state)(Request.make(`runner:${logId}:${entry.cursor}`), events);
	});
