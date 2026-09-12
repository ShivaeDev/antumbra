import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingSuperseded } from "#facts/ruling-superseded.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingSupersededMaterializer = materializer(rulingSuperseded, {
	writes: [ruling],
	run: Effect.fn("rulings.rulingSuperseded")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		yield* rows.ruling.update(fact.rulingId, { supersession: { byRulingId: fact.byRulingId, by: fact.by, at } });
	}),
});
