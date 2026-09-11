import { materializer } from "@antumbra/feature/materializer.ts";
import { Effect, Option } from "effect";
import { countSet } from "#facts/count-set.ts";
import { FLEET } from "#ids.ts";
import { count } from "#rows/count.ts";

export const countSetMaterializer = materializer(countSet, {
	writes: [count],
	run: Effect.fn("settings.CountSet")(function* (fact, rows) {
		const set = { count: fact.count, key: fact.key, scope: FLEET };
		const stored = yield* rows.count.find(fact.key);
		if (Option.isNone(stored)) {
			return yield* rows.count.insert(set);
		}
		yield* rows.count.update(fact.key, set);
	}),
});
