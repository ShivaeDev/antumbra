import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { COUNT_KEYS, COUNTS, CountKey, FLEET } from "#ids.ts";
import { count } from "#rows/count.ts";

export const CountReading = Schema.Struct({
	count: Schema.Number,
	description: Schema.String,
	key: CountKey,
	title: Schema.String,
	unit: Schema.NullOr(Schema.String),
});

export const counts = query("counts", {
	input: {},
	output: Schema.Array(CountReading),
	reads: [count],
	scope: () => FLEET,
	run: Effect.fn("settings.counts")(function* (_input, rows) {
		const stored = yield* rows.count.where({ scope: FLEET });
		return COUNT_KEYS.map((key) => ({
			count: stored.find((candidate) => candidate.key === key)?.count ?? COUNTS[key].fallback,
			description: COUNTS[key].description,
			key,
			title: COUNTS[key].title,
			unit: COUNTS[key].unit,
		}));
	}),
});
