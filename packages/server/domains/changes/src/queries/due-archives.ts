import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { type ChangeRow, change } from "#rows/change.ts";

const ARCHIVE_AFTER_MILLIS = 7 * 24 * 60 * 60 * 1000;

export const dueArchives = query("dueArchives", {
	input: { now: Schema.Number },
	output: Schema.Array(change.Row),
	reads: [change],
	run: Effect.fn("changes.dueArchives")(function* (input, rows) {
		const due: ChangeRow[] = [];
		for (const held of yield* rows.change.where({})) {
			const landed = held.landedAt ?? held.withdrawnAt;
			if (held.archivedAt !== null || landed === null) continue;
			if (input.now - Date.parse(landed) >= ARCHIVE_AFTER_MILLIS) due.push(held);
		}
		return due;
	}),
});
