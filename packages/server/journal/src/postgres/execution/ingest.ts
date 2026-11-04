import { Effect } from "effect";
import type { ObservedFact } from "#observe.ts";
import { ingestEntry } from "#postgres/execution/ingest-entry.ts";

import type { State } from "#postgres/execution/state.ts";
import { cursor, locked } from "#postgres/execution/write.ts";

export interface RunnerEntry {
	readonly cursor: number;
	readonly at: number;
	readonly facts: readonly ObservedFact[];
	readonly before: Effect.Effect<void>;
}
export const ingest = (state: State) =>
	Effect.fn("ExecutionHistory.ingest")(function* (input: { readonly logId: string; readonly entries: readonly RunnerEntry[] }) {
		return yield* locked(
			Effect.gen(function* () {
				let consumed = yield* cursor(input.logId);
				for (const entry of input.entries) {
					if (entry.cursor <= consumed) continue;
					yield* ingestEntry(state)(input.logId, entry);
					consumed = entry.cursor;
				}
				return consumed;
			}),
		);
	});
