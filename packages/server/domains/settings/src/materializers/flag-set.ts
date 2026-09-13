import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option } from "effect";
import { flagSet } from "#facts/flag-set.ts";
import { FLEET } from "#ids.ts";
import { flag } from "#rows/flag.ts";

export const flagSetMaterializer = materializer(flagSet, {
	writes: [flag],
	run: Effect.fn("settings.FlagSet")(function* (fact, rows) {
		for (const key of fact.keys) {
			const set = { key, on: fact.on, scope: FLEET };
			const stored = yield* rows.flag.find(key);
			if (Option.isNone(stored)) yield* rows.flag.insert(set);
			else yield* rows.flag.update(key, set);
		}
	}),
});
