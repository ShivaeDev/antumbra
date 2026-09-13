import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { ChangeId } from "#ids.ts";
import { change } from "#rows/change.ts";

const Archivable = Schema.Struct({ id: ChangeId, landedAt: Schema.String });

export const archivable = query("archivable", {
	input: {},
	output: Schema.Array(Archivable),
	reads: [change],
	run: Effect.fn("changes.archivable")(function* (_input, rows) {
		const settled: (typeof Archivable.Type)[] = [];
		for (const held of yield* rows.change.where({ archivedAt: null })) {
			const landed = held.landedAt ?? held.withdrawnAt;
			if (landed !== null) settled.push({ id: held.id, landedAt: landed });
		}
		return settled;
	}),
});
