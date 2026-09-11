import { materializer } from "@antumbra/feature/materializer.ts";
import { Effect, Option } from "effect";
import { flagSet } from "#facts/flag-set.ts";
import { FLEET } from "#ids.ts";
import { flag } from "#rows/flag.ts";

export const flagSetMaterializer = materializer(flagSet, {
	writes: [flag],
	run: Effect.fn("settings.FlagSet")(function* (fact, rows) {
		const set = { key: fact.key, on: fact.on, scope: FLEET };
		const stored = yield* rows.flag.find(fact.key);
		if (Option.isNone(stored)) {
			return yield* rows.flag.insert(set);
		}
		yield* rows.flag.update(fact.key, set);
	}),
});
