import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingContextAdded } from "#facts/ruling-context-added.ts";
import { ruling } from "#rows/ruling.ts";
export const rulingContextAddedMaterializer = materializer(rulingContextAdded, {
	writes: [ruling],
	run: Effect.fn("rulings.rulingContextAdded")(function* (fact, rows) {
		const at = new Date(fact.at).toISOString();
		const current = yield* rows.ruling.get(fact.rulingId);
		yield* rows.ruling.update(fact.rulingId, {
			contexts: [...current.contexts, { id: fact.requestId, authorAgentId: fact.authorAgentId, body: fact.body, at }],
		});
	}),
});
