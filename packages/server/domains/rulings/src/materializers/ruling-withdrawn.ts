import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingWithdrawn } from "#facts/ruling-withdrawn.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingWithdrawnMaterializer = materializer(rulingWithdrawn, {
	writes: [ruling],
	run: Effect.fn("rulings.rulingWithdrawn")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		yield* rows.ruling.update(fact.rulingId, { withdrawal: { note: fact.note, by: fact.by, at } });
	}),
});
