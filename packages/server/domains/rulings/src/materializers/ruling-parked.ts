import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingParked } from "#facts/ruling-parked.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingParkedMaterializer = materializer(rulingParked, {
	writes: [ruling],
	run: Effect.fn("rulings.rulingParked")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		yield* rows.ruling.update(fact.rulingId, { parked: { note: fact.note, at } });
	}),
});
