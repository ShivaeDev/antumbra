import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { voyage } from "#rows/voyage.ts";

export const list = query("list", {
	input: {},
	output: Schema.Array(voyage.Row),
	reads: [voyage],
	run: Effect.fn("voyages.list")(function* (_input, rows) {
		const stored = yield* rows.voyage.where({});
		return stored.toSorted((left, right) => left.openedAt.localeCompare(right.openedAt));
	}),
});
