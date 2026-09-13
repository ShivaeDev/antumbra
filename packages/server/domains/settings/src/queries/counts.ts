import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { COUNT_KEYS, type CountDeclaration, CountKey, FLEET } from "#ids.ts";
import { count } from "#rows/count.ts";

const MINUTES = "min";

export const CountReading = Schema.Struct({
	count: Schema.Number,
	description: Schema.String,
	key: CountKey,
	title: Schema.String,
	unit: Schema.NullOr(Schema.String),
});

export const COUNTS: Readonly<Record<CountKey, CountDeclaration>> = {
	idleSiestaMinutes: {
		description: "Shorter waits free capacity sooner; longer waits are more likely to keep conversation context cached.",
		fallback: 60,
		max: 1440,
		min: 1,
		title: "Idle before siesta",
		unit: MINUTES,
	},
	maxParallelSessions: {
		description: "How many agents may be running at once.",
		fallback: 4,
		max: 64,
		min: 1,
		title: "Maximum running agents",
		unit: null,
	},
	retireRestMinutes: {
		description: "How long an agent must have rested before the sweep may retire it.",
		fallback: 15,
		max: 1440,
		min: 1,
		title: "Rest before retirement",
		unit: MINUTES,
	},
	routineMailMinutes: {
		description: "Routine mail waits this long before it wakes a resting agent; priority and flash mail wake one at once.",
		fallback: 5,
		max: 1440,
		min: 1,
		title: "Routine mail before a wake",
		unit: MINUTES,
	},
};

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
