import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingDelivered } from "#facts/ruling-delivered.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingDeliveredMaterializer = materializer(rulingDelivered, {
	writes: [ruling],
	run: Effect.fn("rulings.rulingDelivered")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		yield* rows.ruling.update(fact.rulingId, { deliveredAt: at });
	}),
});
