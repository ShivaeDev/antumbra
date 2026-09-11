import { query } from "@antumbra/feature/query.ts";
import { Effect, Schema } from "effect";
import { COUNT_KEYS, COUNTS, CountKey, FLEET } from "#ids.ts";
import { count } from "#rows/count.ts";

export const counts = query("counts", {
	input: {},
	output: Schema.Array(Schema.Struct({ count: Schema.Number, key: CountKey, title: Schema.String })),
	reads: [count],
	scope: () => FLEET,
	run: Effect.fn("settings.counts")(function* (_input, rows) {
		const stored = yield* rows.count.where({ scope: FLEET });
		return COUNT_KEYS.map((key) => ({
			count: stored.find((candidate) => candidate.key === key)?.count ?? COUNTS[key].fallback,
			key,
			title: COUNTS[key].title,
		}));
	}),
});
