import { Effect } from "effect";
import { ingestEntry } from "#execution/ingest-entry.ts";
import { cursor, locked } from "#execution/write.ts";
import type { ObservedFact } from "#observe.ts";

export interface RunnerEntry {
	readonly cursor: number;
	readonly at: number;
	readonly facts: readonly ObservedFact[];
	readonly before: Effect.Effect<void>;
}
export const ingest = Effect.fn("ExecutionHistory.ingest")(function* (input: { readonly logId: string; readonly entries: readonly RunnerEntry[] }) {
	return yield* locked(
		Effect.gen(function* () {
			let consumed = yield* cursor(input.logId);
			for (const entry of input.entries) {
				if (entry.cursor <= consumed) continue;
				yield* ingestEntry(input.logId, entry);
				consumed = entry.cursor;
			}
			return consumed;
		}),
	);
});
