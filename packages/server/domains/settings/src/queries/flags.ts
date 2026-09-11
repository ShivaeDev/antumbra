import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { FLAG_KEYS, FLAGS, FLEET, FlagKey } from "#ids.ts";
import { flag } from "#rows/flag.ts";

export const flags = query("flags", {
	input: {},
	output: Schema.Array(Schema.Struct({ key: FlagKey, on: Schema.Boolean, title: Schema.String })),
	reads: [flag],
	scope: () => FLEET,
	run: Effect.fn("settings.flags")(function* (_input, rows) {
		const stored = yield* rows.flag.where({ scope: FLEET });
		return FLAG_KEYS.map((key) => ({
			key,
			on: stored.find((candidate) => candidate.key === key)?.on ?? FLAGS[key].fallback,
			title: FLAGS[key].title,
		}));
	}),
});
